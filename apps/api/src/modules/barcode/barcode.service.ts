import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export type BarcodeType = 'EAN13' | 'CODE128' | 'QR';

interface BulkGenerateItem {
  productId: string;
  variantId?: string;
  type: BarcodeType;
  quantity: number;
}

interface LabelItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface CreateLabelTemplateDto {
  name: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  config?: Record<string, any>;
}

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Barcode Generation ───────────────────────────────────────────────────

  async generateBarcode(
    productId: string,
    variantId?: string,
    type: BarcodeType = 'CODE128',
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const code = await this.generateCode(type, productId, variantId);

    const barcode = await this.prisma.barcode.create({
      data: {
        code,
        type,
        productId,
        variantId: variantId ?? null,
      },
    });

    // Update the product barcode field if it doesn't have one
    if (!product.barcode) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { barcode: code },
      });
    }

    return barcode;
  }

  async generateBulk(items: BulkGenerateItem[]) {
    const results: any[] = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        try {
          const barcode = await this.generateBarcode(
            item.productId,
            item.variantId,
            item.type,
          );
          results.push({ success: true, barcode });
        } catch (err) {
          results.push({
            success: false,
            productId: item.productId,
            error: err.message,
          });
        }
      }
    }
    return {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async getByCode(code: string) {
    const barcode = await this.prisma.barcode.findFirst({
      where: { code },
      include: {
        product: {
          include: { variants: true },
        },
      },
    });
    if (!barcode) throw new NotFoundException(`Barcode '${code}' not found`);
    return barcode;
  }

  async generateQRCode(productId: string): Promise<string> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, barcode: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const payload = JSON.stringify({
      id: product.id,
      name: product.name,
      sku: product.sku,
    });

    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      width: 300,
    });

    return dataUrl;
  }

  async generateLabelPDF(items: LabelItem[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 20 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const labelWidth = 180;
      const labelHeight = 90;
      const colCount = 3;
      const marginX = 20;
      const marginY = 20;
      const paddingX = 10;
      const paddingY = 5;

      let x = marginX;
      let y = marginY;
      let col = 0;

      for (const item of items) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          doc
            .rect(x, y, labelWidth, labelHeight)
            .stroke()
            .fontSize(8)
            .text(`Product: ${item.productId}`, x + paddingX, y + paddingY, {
              width: labelWidth - paddingX * 2,
            });

          if (item.variantId) {
            doc.text(`Variant: ${item.variantId}`, x + paddingX, y + paddingY + 14, {
              width: labelWidth - paddingX * 2,
            });
          }

          col++;
          if (col >= colCount) {
            col = 0;
            x = marginX;
            y += labelHeight + paddingY;
            if (y + labelHeight > doc.page.height - marginY) {
              doc.addPage();
              y = marginY;
            }
          } else {
            x += labelWidth + paddingX;
          }
        }
      }

      doc.end();
    });
  }

  async getLabelTemplates() {
    return this.prisma.labelTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLabelTemplate(dto: CreateLabelTemplateDto) {
    return this.prisma.labelTemplate.create({
      data: {
        name: dto.name,
        width: dto.width,
        height: dto.height,
        columns: dto.columns,
        rows: dto.rows,
        config: dto.config ?? {},
      },
    });
  }

  async generateSKU(prefix?: string): Promise<string> {
    const key = 'sku:sequence';
    const seq = await this.redis.incr(key);
    const pad = String(seq).padStart(6, '0');
    const base = prefix ? `${prefix.toUpperCase()}-${pad}` : `SKU-${pad}`;

    // Ensure uniqueness in DB
    const existing = await this.prisma.product.findFirst({
      where: { sku: base },
    });
    if (existing) {
      // Append random suffix if collision
      return `${base}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }
    return base;
  }

  async validateBarcode(code: string) {
    const isEAN13 = /^\d{13}$/.test(code);
    const isCODE128 = /^[\x20-\x7E]{1,48}$/.test(code);
    const isQR = code.length > 0;

    const format = isEAN13 ? 'EAN13' : isCODE128 ? 'CODE128' : isQR ? 'QR' : 'UNKNOWN';
    const isValid = isEAN13 || isCODE128;

    const existing = await this.prisma.barcode.findFirst({
      where: { code },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    return {
      code,
      format,
      isValid,
      exists: !!existing,
      product: existing?.product ?? null,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateCode(
    type: BarcodeType,
    productId: string,
    variantId?: string,
  ): Promise<string> {
    if (type === 'EAN13') {
      return this.generateEAN13();
    } else if (type === 'CODE128') {
      return this.generateCode128(productId, variantId);
    } else {
      // QR uses JSON payload as the code
      return JSON.stringify({ productId, variantId, ts: Date.now() });
    }
  }

  private generateEAN13(): string {
    // Generate 12 random digits + checksum
    const digits: number[] = [];
    for (let i = 0; i < 12; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }
    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    digits.push(check);
    return digits.join('');
  }

  private generateCode128(productId: string, variantId?: string): string {
    const prefix = productId.substring(0, 4).toUpperCase();
    const variant = variantId ? variantId.substring(0, 4).toUpperCase() : 'BASE';
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${variant}-${rand}`;
  }
}
