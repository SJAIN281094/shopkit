export interface ProductOption {
  name: string;
  values: string[];
}

export const MAX_PRODUCT_OPTIONS = 3;
export const MAX_OPTION_VALUES = 20;
export const MAX_VARIANTS = 100;

export function variantTitle(optionValues: string[]): string {
  return optionValues.join(' / ');
}

/** Identifies a variant by its option values, case-insensitively. */
export function variantKey(optionValues: string[]): string {
  return optionValues.map((v) => v.trim().toLowerCase()).join('\u0000');
}

/** Every combination of option values, in option order. */
export function variantCombinations(options: ProductOption[]): string[][] {
  return options.reduce<string[][]>(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => [...combo, value])),
    [[]],
  );
}
