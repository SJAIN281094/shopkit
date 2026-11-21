export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export function isGstRate(value: number): value is GstRate {
  return (GST_RATES as readonly number[]).includes(value);
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Format and checksum check for a 15-character GSTIN. */
export function isValidGstin(value: string): boolean {
  const gstin = value.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(gstin)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = BASE36.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return BASE36[(36 - (sum % 36)) % 36] === gstin[14];
}

export function gstinStateCode(gstin: string): string {
  return gstin.slice(0, 2);
}

export interface TaxSplit {
  /** Value before tax, in paise. */
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

/**
 * Splits a tax-inclusive amount (paise) into taxable value and GST.
 * Same-state sales are CGST + SGST; sales to another state are IGST.
 */
export function splitInclusiveGst(amount: number, rate: number, sameState: boolean): TaxSplit {
  const taxable = Math.round((amount * 100) / (100 + rate));
  const tax = amount - taxable;
  if (!sameState) return { taxable, cgst: 0, sgst: 0, igst: tax };
  // Invoices must show equal CGST and SGST, so an odd paisa goes to the taxable value instead.
  const half = Math.floor(tax / 2);
  return { taxable: amount - 2 * half, cgst: half, sgst: half, igst: 0 };
}
