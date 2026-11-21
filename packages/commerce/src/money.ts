const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const INR_WHOLE = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** 149900 -> "₹1,499"; 149950 -> "₹1,499.50". */
export function formatInr(paise: number): string {
  return paise % 100 === 0 ? INR_WHOLE.format(paise / 100) : INR.format(paise / 100);
}
