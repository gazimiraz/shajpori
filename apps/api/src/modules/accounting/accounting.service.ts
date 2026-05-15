import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AccountType, JournalEntryStatus, InvoiceStatus } from '@prisma/client';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import {
  CreateJournalEntryDto,
  VoidJournalEntryDto,
} from './dto/create-journal-entry.dto';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
} from './dto/create-invoice.dto';
import {
  CreateExpenseDto,
  ExpenseFiltersDto,
} from './dto/create-expense.dto';
import { Decimal } from '@prisma/client/runtime/library';

interface InvoiceFilters {
  status?: InvoiceStatus;
  customerId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Chart of Accounts ───────────────────────────────────────────────────

  async getChartOfAccounts() {
    const accounts = await this.prisma.accountChart.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: { children: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    return accounts;
  }

  async createAccount(dto: CreateAccountDto) {
    if (dto.parentId) {
      const parent = await this.prisma.accountChart.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent account not found');
    }
    const existing = await this.prisma.accountChart.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException(`Account code '${dto.code}' already exists`);

    return this.prisma.accountChart.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        description: dto.description,
        openingBalance: dto.openingBalance ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAccount(id: string, dto: UpdateAccountDto) {
    await this.findAccountOrFail(id);
    return this.prisma.accountChart.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.openingBalance !== undefined && { openingBalance: dto.openingBalance }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteAccount(id: string) {
    const account = await this.findAccountOrFail(id);
    if (account.isSystem) {
      throw new BadRequestException('System accounts cannot be deleted');
    }
    const lineCount = await this.prisma.journalLine.count({ where: { accountId: id } });
    if (lineCount > 0) {
      throw new BadRequestException('Account has journal entries and cannot be deleted');
    }
    return this.prisma.accountChart.delete({ where: { id } });
  }

  // ─── Journal Entries ──────────────────────────────────────────────────────

  async createJournalEntry(dto: CreateJournalEntryDto, createdBy?: string) {
    // Validate debits == credits
    const totalDebit = dto.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = dto.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new BadRequestException(
        `Journal entry is not balanced: debits ${totalDebit} ≠ credits ${totalCredit}`,
      );
    }
    if (totalDebit === 0) {
      throw new BadRequestException('Journal entry must have non-zero amounts');
    }

    // Verify all accounts exist
    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.accountChart.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, isActive: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more account ids are invalid');
    }
    const inactive = accounts.filter((a) => !a.isActive);
    if (inactive.length > 0) {
      throw new BadRequestException('One or more accounts are inactive');
    }

    const entryNumber = await this.generateEntryNumber();

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(dto.date),
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            description: l.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async postJournalEntry(id: string, postedBy?: string) {
    const entry = await this.findJournalEntryOrFail(id);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(`Entry is already ${entry.status}`);
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.POSTED,
        postedBy,
        postedAt: new Date(),
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async voidJournalEntry(id: string, dto: VoidJournalEntryDto, voidedBy?: string) {
    const entry = await this.findJournalEntryOrFail(id);
    if (entry.status === JournalEntryStatus.VOIDED) {
      throw new BadRequestException('Entry is already voided');
    }

    // Mark original as VOIDED
    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.VOIDED,
        voidedBy,
        voidedAt: new Date(),
      },
    });

    // Create reversal entry (swap debits and credits)
    const reversalEntryNumber = await this.generateEntryNumber();
    const reversalEntry = await this.prisma.journalEntry.create({
      data: {
        entryNumber: reversalEntryNumber,
        date: new Date(),
        description: `Reversal of ${entry.entryNumber}: ${dto.reason}`,
        referenceType: 'JOURNAL_VOID',
        referenceId: id,
        createdBy: voidedBy,
        status: JournalEntryStatus.POSTED,
        postedBy: voidedBy,
        postedAt: new Date(),
        lines: {
          create: entry.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.credit),
            credit: Number(l.debit),
            description: `Reversal: ${l.description ?? ''}`,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    return { voided: entry, reversal: reversalEntry };
  }

  // ─── Trial Balance ────────────────────────────────────────────────────────

  async getTrialBalance(date?: string) {
    const asOf = date ? new Date(date) : new Date();

    const accounts = await this.prisma.accountChart.findMany({
      where: { isActive: true },
      include: {
        journalLines: {
          where: {
            entry: {
              status: JournalEntryStatus.POSTED,
              date: { lte: asOf },
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const rows = accounts.map((acc) => {
      const totalDebit =
        Number(acc.openingBalance) > 0 &&
        [AccountType.ASSET, AccountType.EXPENSE].includes(acc.type)
          ? Number(acc.openingBalance)
          : 0;
      const totalCredit =
        Number(acc.openingBalance) > 0 &&
        [AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE].includes(acc.type)
          ? Number(acc.openingBalance)
          : 0;

      const debitTotal = acc.journalLines.reduce(
        (s, l) => s + Number(l.debit),
        totalDebit,
      );
      const creditTotal = acc.journalLines.reduce(
        (s, l) => s + Number(l.credit),
        totalCredit,
      );

      const balance = debitTotal - creditTotal;

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: debitTotal,
        credit: creditTotal,
        balance,
      };
    });

    const grandDebit = rows.reduce((s, r) => s + r.debit, 0);
    const grandCredit = rows.reduce((s, r) => s + r.credit, 0);

    return { asOf, rows, totals: { debit: grandDebit, credit: grandCredit } };
  }

  // ─── Profit & Loss ────────────────────────────────────────────────────────

  async getProfitLoss(from: Date, to: Date) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          status: JournalEntryStatus.POSTED,
          date: { gte: from, lte: to },
        },
        account: {
          type: {
            in: [
              AccountType.REVENUE,
              AccountType.CONTRA_REVENUE,
              AccountType.EXPENSE,
            ],
          },
        },
      },
      include: { account: { select: { id: true, code: true, name: true, type: true } } },
    });

    const groupByAccount = this.groupLines(lines);

    const revenue = groupByAccount.filter(
      (g) => g.type === AccountType.REVENUE,
    );
    const contraRevenue = groupByAccount.filter(
      (g) => g.type === AccountType.CONTRA_REVENUE,
    );
    const expenses = groupByAccount.filter(
      (g) => g.type === AccountType.EXPENSE,
    );

    const totalRevenue = revenue.reduce((s, g) => s + g.net, 0);
    const totalContra = contraRevenue.reduce((s, g) => s + g.net, 0);
    const totalExpenses = expenses.reduce((s, g) => s + g.net, 0);

    const grossProfit = totalRevenue - totalContra;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { from, to },
      revenue: { items: revenue, total: totalRevenue },
      contraRevenue: { items: contraRevenue, total: totalContra },
      grossProfit,
      expenses: { items: expenses, total: totalExpenses },
      netProfit,
    };
  }

  // ─── Balance Sheet ────────────────────────────────────────────────────────

  async getBalanceSheet(date?: string) {
    const asOf = date ? new Date(date) : new Date();

    const lines = await this.prisma.journalLine.findMany({
      where: {
        entry: {
          status: JournalEntryStatus.POSTED,
          date: { lte: asOf },
        },
        account: {
          type: {
            in: [
              AccountType.ASSET,
              AccountType.CONTRA_ASSET,
              AccountType.LIABILITY,
              AccountType.CONTRA_LIABILITY,
              AccountType.EQUITY,
              AccountType.CONTRA_EQUITY,
            ],
          },
        },
      },
      include: { account: { select: { id: true, code: true, name: true, type: true } } },
    });

    const grouped = this.groupLines(lines);

    const assets = grouped.filter((g) => g.type === AccountType.ASSET);
    const contraAssets = grouped.filter((g) => g.type === AccountType.CONTRA_ASSET);
    const liabilities = grouped.filter((g) => g.type === AccountType.LIABILITY);
    const contraLiabilities = grouped.filter(
      (g) => g.type === AccountType.CONTRA_LIABILITY,
    );
    const equity = grouped.filter((g) => g.type === AccountType.EQUITY);
    const contraEquity = grouped.filter((g) => g.type === AccountType.CONTRA_EQUITY);

    const totalAssets =
      assets.reduce((s, g) => s + g.net, 0) -
      contraAssets.reduce((s, g) => s + g.net, 0);
    const totalLiabilities =
      liabilities.reduce((s, g) => s + g.net, 0) -
      contraLiabilities.reduce((s, g) => s + g.net, 0);
    const totalEquity =
      equity.reduce((s, g) => s + g.net, 0) -
      contraEquity.reduce((s, g) => s + g.net, 0);

    return {
      asOf,
      assets: { items: assets, contra: contraAssets, total: totalAssets },
      liabilities: {
        items: liabilities,
        contra: contraLiabilities,
        total: totalLiabilities,
      },
      equity: { items: equity, contra: contraEquity, total: totalEquity },
      liabilitiesAndEquity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  // ─── Cash Flow ────────────────────────────────────────────────────────────

  async getCashFlow(from: Date, to: Date) {
    // Simplified indirect method — operating = net income + non-cash adjustments
    const pnl = await this.getProfitLoss(from, to);

    // Cash accounts (typically code starts with 1)
    const cashAccounts = await this.prisma.accountChart.findMany({
      where: { type: AccountType.ASSET, code: { startsWith: '1' } },
      select: { id: true },
    });
    const cashIds = cashAccounts.map((a) => a.id);

    const cashLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: cashIds },
        entry: {
          status: JournalEntryStatus.POSTED,
          date: { gte: from, lte: to },
        },
      },
      include: {
        entry: { select: { referenceType: true } },
      },
    });

    let operating = 0;
    let investing = 0;
    let financing = 0;

    for (const line of cashLines) {
      const netCash = Number(line.debit) - Number(line.credit);
      const refType = line.entry.referenceType;
      if (refType === 'PURCHASE_ORDER' || refType === 'ASSET_PURCHASE') {
        investing += netCash;
      } else if (refType === 'LOAN' || refType === 'EQUITY') {
        financing += netCash;
      } else {
        operating += netCash;
      }
    }

    return {
      period: { from, to },
      operating: { amount: operating },
      investing: { amount: investing },
      financing: { amount: financing },
      netChange: operating + investing + financing,
      netIncome: pnl.netProfit,
    };
  }

  // ─── Account Ledger ───────────────────────────────────────────────────────

  async getAccountLedger(accountId: string, from: Date, to: Date) {
    const account = await this.findAccountOrFail(accountId);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        entry: {
          status: JournalEntryStatus.POSTED,
          date: { gte: from, lte: to },
        },
      },
      include: {
        entry: {
          select: {
            entryNumber: true,
            date: true,
            description: true,
            referenceType: true,
            referenceId: true,
          },
        },
      },
      orderBy: { entry: { date: 'asc' } },
    });

    let runningBalance = 0;
    const rows = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      runningBalance += debit - credit;
      return {
        date: l.entry.date,
        entryNumber: l.entry.entryNumber,
        description: l.description ?? l.entry.description,
        referenceType: l.entry.referenceType,
        referenceId: l.entry.referenceId,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return { account, period: { from, to }, rows };
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto) {
    const items = dto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = (lineTotal * taxRate) / 100;
      return { ...item, lineTotal, taxAmount };
    });

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: dto.orderId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        customerAddress: dto.customerAddress,
        subtotal,
        taxAmount,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        items: {
          create: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate ?? 0,
            totalAmount: i.lineTotal + i.taxAmount,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findInvoiceOrFail(id);
    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.VOIDED
    ) {
      throw new BadRequestException('Paid or voided invoices cannot be updated');
    }

    if (!dto.items || dto.items.length === 0) {
      return this.prisma.invoice.update({
        where: { id },
        data: {
          ...(dto.customerName && { customerName: dto.customerName }),
          ...(dto.customerEmail && { customerEmail: dto.customerEmail }),
          ...(dto.customerPhone && { customerPhone: dto.customerPhone }),
          ...(dto.customerAddress && { customerAddress: dto.customerAddress }),
          ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: { items: true },
      });
    }

    const items = dto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const lineTotal = item.quantity! * item.unitPrice!;
      const taxAmount = (lineTotal * taxRate) / 100;
      return { ...item, lineTotal, taxAmount };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return this.prisma.invoice.update({
      where: { id },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
        ...(dto.customerName && { customerName: dto.customerName }),
        ...(dto.customerEmail && { customerEmail: dto.customerEmail }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        items: {
          create: items.map((i) => ({
            description: i.description!,
            quantity: i.quantity!,
            unitPrice: i.unitPrice!,
            taxRate: i.taxRate ?? 0,
            totalAmount: i.lineTotal + i.taxAmount,
          })),
        },
      },
      include: { items: true },
    });
  }

  async sendInvoice(id: string) {
    const invoice = await this.findInvoiceOrFail(id);
    if (invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException('Cannot send a voided invoice');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT, issuedAt: new Date() },
      include: { items: true },
    });
  }

  async recordPayment(id: string, dto: RecordPaymentDto, recordedBy?: string) {
    const invoice = await this.findInvoiceOrFail(id);
    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.VOIDED ||
      invoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException(`Invoice is ${invoice.status}`);
    }

    const outstanding =
      Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (dto.amount > outstanding + 0.005) {
      throw new BadRequestException(
        `Payment ${dto.amount} exceeds outstanding balance ${outstanding}`,
      );
    }

    const newPaid = Number(invoice.paidAmount) + dto.amount;
    const isFullyPaid = newPaid >= Number(invoice.totalAmount) - 0.005;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        status: isFullyPaid
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID,
        paidAt: isFullyPaid ? new Date() : undefined,
      },
      include: { items: true },
    });

    // Auto-create journal entry for payment
    await this.createJournalEntry(
      {
        date: new Date().toISOString().split('T')[0],
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
        referenceType: 'INVOICE',
        referenceId: id,
        lines: await this.buildPaymentJournalLines(dto.amount),
      },
      recordedBy,
    );

    return updated;
  }

  async getInvoices(filters: InvoiceFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  async createExpense(dto: CreateExpenseDto, createdBy: string) {
    return this.prisma.expense.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'BDT',
        date: new Date(dto.date),
        receiptUrl: dto.receiptUrl,
        approvedBy: dto.approvedBy,
        createdBy,
        notes: dto.notes,
      },
    });
  }

  async getExpenses(filters: ExpenseFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── VAT Report ───────────────────────────────────────────────────────────

  async getVATReport(from: Date, to: Date) {
    // VAT collected from sales (output VAT)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.SENT] },
        createdAt: { gte: from, lte: to },
      },
      select: { taxAmount: true, totalAmount: true, subtotal: true },
    });

    // VAT paid on purchases (input VAT)
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      select: { taxAmount: true, totalAmount: true },
    });

    const vatCollected = invoices.reduce((s, i) => s + Number(i.taxAmount), 0);
    const vatPaid = purchaseOrders.reduce((s, po) => s + Number(po.taxAmount), 0);
    const netVat = vatCollected - vatPaid;

    return {
      period: { from, to },
      outputVAT: {
        taxableAmount: invoices.reduce((s, i) => s + Number(i.subtotal), 0),
        vatAmount: vatCollected,
        invoiceCount: invoices.length,
      },
      inputVAT: {
        taxableAmount: purchaseOrders.reduce(
          (s, po) => s + (Number(po.totalAmount) - Number(po.taxAmount)),
          0,
        ),
        vatAmount: vatPaid,
        purchaseCount: purchaseOrders.length,
      },
      netVATPayable: netVat,
    };
  }

  // ─── Aged Receivables ─────────────────────────────────────────────────────

  async getAgedReceivables() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
        },
      },
      include: { items: true },
    });

    const aged = invoices.map((inv) => {
      const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issuedAt);
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - dueDate.getTime()) / 86400000),
      );

      let bucket: string;
      if (daysOverdue === 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = '1-30 days';
      else if (daysOverdue <= 60) bucket = '31-60 days';
      else if (daysOverdue <= 90) bucket = '61-90 days';
      else bucket = '90+ days';

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        invoiceDate: inv.issuedAt,
        dueDate,
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        outstanding,
        daysOverdue,
        ageBucket: bucket,
      };
    });

    const buckets = ['current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];
    const summary = buckets.map((b) => {
      const bucket = aged.filter((a) => a.ageBucket === b);
      return {
        bucket: b,
        count: bucket.length,
        total: bucket.reduce((s, a) => s + a.outstanding, 0),
      };
    });

    return {
      invoices: aged.sort((a, b) => b.daysOverdue - a.daysOverdue),
      summary,
      grandTotal: aged.reduce((s, a) => s + a.outstanding, 0),
    };
  }

  // ─── Auto-journal for Orders ──────────────────────────────────────────────

  async createOrderJournalEntry(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Lookup key accounts (create defaults if missing)
    const [cashAcc, revenueAcc, cogsAcc, inventoryAcc] = await Promise.all([
      this.findOrCreateSystemAccount('1001', 'Cash', AccountType.ASSET),
      this.findOrCreateSystemAccount('4001', 'Sales Revenue', AccountType.REVENUE),
      this.findOrCreateSystemAccount('5001', 'Cost of Goods Sold', AccountType.EXPENSE),
      this.findOrCreateSystemAccount('1201', 'Inventory', AccountType.ASSET),
    ]);

    const revenue = Number(order.totalAmount);
    const cogs = order.items.reduce(
      (s, i) => s + (i.costPrice ? Number(i.costPrice) * i.quantity : 0),
      0,
    );

    const lines: any[] = [
      { accountId: cashAcc.id, debit: revenue, credit: 0, description: `Order ${order.orderNumber}` },
      { accountId: revenueAcc.id, debit: 0, credit: revenue, description: `Sales - Order ${order.orderNumber}` },
    ];

    if (cogs > 0) {
      lines.push(
        { accountId: cogsAcc.id, debit: cogs, credit: 0, description: 'COGS' },
        { accountId: inventoryAcc.id, debit: 0, credit: cogs, description: 'Inventory reduction' },
      );
    }

    try {
      return await this.createJournalEntry({
        date: order.createdAt.toISOString().split('T')[0],
        description: `Sale - Order ${order.orderNumber}`,
        referenceType: 'ORDER',
        referenceId: orderId,
        lines,
      });
    } catch (err) {
      this.logger.error(`Failed to create journal entry for order ${orderId}: ${err.message}`);
      return null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findAccountOrFail(id: string) {
    const account = await this.prisma.accountChart.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  private async findJournalEntryOrFail(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    return entry;
  }

  private async findInvoiceOrFail(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  private async generateEntryNumber(): Promise<string> {
    const key = 'accounting:journal_seq';
    const seq = await this.redis.incr(key);
    const year = new Date().getFullYear();
    return `JE-${year}-${String(seq).padStart(6, '0')}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const key = 'accounting:invoice_seq';
    const seq = await this.redis.incr(key);
    const year = new Date().getFullYear();
    return `INV-${year}-${String(seq).padStart(6, '0')}`;
  }

  private groupLines(
    lines: Array<{
      debit: Decimal;
      credit: Decimal;
      account: { id: string; code: string; name: string; type: AccountType };
    }>,
  ) {
    const map = new Map<
      string,
      { id: string; code: string; name: string; type: AccountType; debit: number; credit: number }
    >();
    for (const line of lines) {
      const key = line.account.id;
      if (!map.has(key)) {
        map.set(key, {
          id: line.account.id,
          code: line.account.code,
          name: line.account.name,
          type: line.account.type,
          debit: 0,
          credit: 0,
        });
      }
      const entry = map.get(key)!;
      entry.debit += Number(line.debit);
      entry.credit += Number(line.credit);
    }
    return Array.from(map.values()).map((e) => ({
      ...e,
      net: e.debit - e.credit,
    }));
  }

  private async buildPaymentJournalLines(amount: number) {
    const cashAcc = await this.findOrCreateSystemAccount('1001', 'Cash', AccountType.ASSET);
    const receivablesAcc = await this.findOrCreateSystemAccount(
      '1101',
      'Accounts Receivable',
      AccountType.ASSET,
    );
    return [
      { accountId: cashAcc.id, debit: amount, credit: 0 },
      { accountId: receivablesAcc.id, debit: 0, credit: amount },
    ];
  }

  private async findOrCreateSystemAccount(
    code: string,
    name: string,
    type: AccountType,
  ) {
    let account = await this.prisma.accountChart.findUnique({ where: { code } });
    if (!account) {
      account = await this.prisma.accountChart.create({
        data: { code, name, type, isSystem: true, isActive: true },
      });
    }
    return account;
  }
}
