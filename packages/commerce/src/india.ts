export interface IndianState {
  /** GST state code, as used in the first two digits of a GSTIN. */
  code: string;
  name: string;
}

export const INDIAN_STATES: readonly IndianState[] = [
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '18', name: 'Assam' },
  { code: '10', name: 'Bihar' },
  { code: '04', name: 'Chandigarh' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '07', name: 'Delhi' },
  { code: '30', name: 'Goa' },
  { code: '24', name: 'Gujarat' },
  { code: '06', name: 'Haryana' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '20', name: 'Jharkhand' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '38', name: 'Ladakh' },
  { code: '31', name: 'Lakshadweep' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '27', name: 'Maharashtra' },
  { code: '14', name: 'Manipur' },
  { code: '17', name: 'Meghalaya' },
  { code: '15', name: 'Mizoram' },
  { code: '13', name: 'Nagaland' },
  { code: '21', name: 'Odisha' },
  { code: '34', name: 'Puducherry' },
  { code: '03', name: 'Punjab' },
  { code: '08', name: 'Rajasthan' },
  { code: '11', name: 'Sikkim' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '16', name: 'Tripura' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '19', name: 'West Bengal' },
];

const STATES_BY_CODE = new Map(INDIAN_STATES.map((s) => [s.code, s]));

export function findState(code: string | null | undefined): IndianState | undefined {
  return code ? STATES_BY_CODE.get(code) : undefined;
}

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export function isValidPincode(value: string): boolean {
  return PINCODE_PATTERN.test(value.trim());
}

/** Accepts 10-digit Indian mobile numbers with or without +91 / 0, and returns them as 91XXXXXXXXXX. */
export function normalizeIndianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.replace(/^0/, '');
  return /^[6-9][0-9]{9}$/.test(local) ? `91${local}` : null;
}

/** 919876543210 -> "+91 98765 43210" */
export function formatIndianPhone(normalized: string): string {
  const match = /^91(\d{5})(\d{5})$/.exec(normalized);
  return match ? `+91 ${match[1]} ${match[2]}` : `+${normalized}`;
}
