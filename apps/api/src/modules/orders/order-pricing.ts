import { splitInclusiveGst, type TaxSplit } from '@shopkit/commerce';
import type { Order, OrderItem, OrderTax, Shop } from '../../entities';

type PricingShop = Pick<Shop, 'shippingFee' | 'freeShippingAbove' | 'gstin' | 'stateCode'>;

export function shippingFor(shop: PricingShop, subtotal: number): number {
  if (shop.freeShippingAbove !== null && subtotal >= shop.freeShippingAbove) return 0;
  return shop.shippingFee;
}

/** Shipping is taxed at the rate of the main item, as one composite supply. */
function shippingRate(items: Pick<OrderItem, 'gstRate'>[]): number {
  return Math.max(0, ...items.map((i) => i.gstRate));
}

export interface InvoiceLine extends TaxSplit {
  label: string;
  hsnCode: string | null;
  quantity: number;
  gstRate: number;
  total: number;
}

/** Prices are GST-inclusive. Only stores with a GSTIN charge GST. */
export function invoiceLines(
  shop: PricingShop,
  order: Pick<Order, 'items' | 'shippingFee' | 'shippingAddress'>,
): InvoiceLine[] | null {
  if (!shop.gstin || !shop.stateCode) return null;
  const sameState = order.shippingAddress.stateCode === shop.stateCode;
  const lines: InvoiceLine[] = order.items.map((item) => ({
    label: item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title,
    hsnCode: item.hsnCode,
    quantity: item.quantity,
    gstRate: item.gstRate,
    total: item.lineTotal,
    ...splitInclusiveGst(item.lineTotal, item.gstRate, sameState),
  }));
  if (order.shippingFee > 0) {
    const rate = shippingRate(order.items);
    lines.push({
      label: 'Shipping',
      hsnCode: '996812',
      quantity: 1,
      gstRate: rate,
      total: order.shippingFee,
      ...splitInclusiveGst(order.shippingFee, rate, sameState),
    });
  }
  return lines;
}

export function taxSummary(lines: InvoiceLine[] | null): OrderTax | null {
  if (!lines) return null;
  return lines.reduce(
    (sum, l) => ({ taxable: sum.taxable + l.taxable, cgst: sum.cgst + l.cgst, sgst: sum.sgst + l.sgst, igst: sum.igst + l.igst }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
  );
}

/** Indian financial year of a date, e.g. "2026-27". */
export function financialYear(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 3600_000);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
