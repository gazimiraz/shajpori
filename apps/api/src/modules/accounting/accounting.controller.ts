import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
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
import { InvoiceStatus } from '@prisma/client';

// These decorators are provided by the auth module (global guards / decorators)
// @Auth() attaches role guard + JWT guard; @CurrentUser() extracts user from request
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Accounting')
@ApiBearerAuth()
@Auth('ADMIN', 'ACCOUNTANT')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ─── Chart of Accounts ───────────────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'Get full chart of accounts (tree)' })
  getChartOfAccounts() {
    return this.accountingService.getChartOfAccounts();
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account' })
  createAccount(@Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Put('accounts/:id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiParam({ name: 'id' })
  updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountingService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an account (only if no journal lines)' })
  @ApiParam({ name: 'id' })
  deleteAccount(@Param('id') id: string) {
    return this.accountingService.deleteAccount(id);
  }

  // ─── Journal Entries ──────────────────────────────────────────────────────

  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a DRAFT journal entry' })
  createJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createJournalEntry(dto, userId);
  }

  @Patch('journal-entries/:id/post')
  @ApiOperation({ summary: 'Post (finalise) a journal entry' })
  @ApiParam({ name: 'id' })
  postJournalEntry(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.postJournalEntry(id, userId);
  }

  @Patch('journal-entries/:id/void')
  @ApiOperation({ summary: 'Void a journal entry and create a reversal' })
  @ApiParam({ name: 'id' })
  voidJournalEntry(
    @Param('id') id: string,
    @Body() dto: VoidJournalEntryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.voidJournalEntry(id, dto, userId);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  @Get('reports/trial-balance')
  @ApiOperation({ summary: 'Trial balance as of a given date' })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date string' })
  getTrialBalance(@Query('date') date?: string) {
    return this.accountingService.getTrialBalance(date);
  }

  @Get('reports/profit-loss')
  @ApiOperation({ summary: 'Profit & loss statement' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getProfitLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.accountingService.getProfitLoss(new Date(from), new Date(to));
  }

  @Get('reports/balance-sheet')
  @ApiOperation({ summary: 'Balance sheet' })
  @ApiQuery({ name: 'date', required: false })
  getBalanceSheet(@Query('date') date?: string) {
    return this.accountingService.getBalanceSheet(date);
  }

  @Get('reports/cash-flow')
  @ApiOperation({ summary: 'Cash flow statement' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getCashFlow(@Query('from') from: string, @Query('to') to: string) {
    return this.accountingService.getCashFlow(new Date(from), new Date(to));
  }

  @Get('reports/vat')
  @ApiOperation({ summary: 'VAT collected vs paid report' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getVATReport(@Query('from') from: string, @Query('to') to: string) {
    return this.accountingService.getVATReport(new Date(from), new Date(to));
  }

  @Get('reports/aged-receivables')
  @ApiOperation({ summary: 'Aged receivables by invoice age bucket' })
  getAgedReceivables() {
    return this.accountingService.getAgedReceivables();
  }

  @Get('ledger/:accountId')
  @ApiOperation({ summary: 'Account ledger with running balance' })
  @ApiParam({ name: 'accountId' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getAccountLedger(
    @Param('accountId') accountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accountingService.getAccountLedger(
      accountId,
      new Date(from),
      new Date(to),
    );
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices (paginated)' })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getInvoices(
    @Query('status') status?: InvoiceStatus,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accountingService.getInvoices({
      status,
      customerId,
      from,
      to,
      page,
      limit,
    });
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create an invoice' })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.accountingService.createInvoice(dto);
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id' })
  updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.accountingService.updateInvoice(id, dto);
  }

  @Patch('invoices/:id/send')
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiParam({ name: 'id' })
  sendInvoice(@Param('id') id: string) {
    return this.accountingService.sendInvoice(id);
  }

  @Post('invoices/:id/payment')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @ApiParam({ name: 'id' })
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.recordPayment(id, dto, userId);
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  @Get('expenses')
  @ApiOperation({ summary: 'List expenses (paginated)' })
  getExpenses(@Query() filters: ExpenseFiltersDto) {
    return this.accountingService.getExpenses(filters);
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Create an expense record' })
  createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createExpense(dto, userId);
  }
}
