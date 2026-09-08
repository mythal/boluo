declare const variableLookupKeyBrand: unique symbol;

export type VariableLookupKey = string & {
  readonly [variableLookupKeyBrand]: true;
};

export type Variables = Readonly<Partial<Record<VariableLookupKey, number>>>;

// Normalize for matching; preserve the original spelling for display and creation.
export const normalizeVariableLookupKey = (name: string): VariableLookupKey =>
  name.trim().normalize('NFC').toLowerCase() as VariableLookupKey;
