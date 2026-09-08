export interface VariableDisplayItem {
  entryId?: string | null;
  scopeId?: string;
  key: string;
  displayName?: string;
  value: number | null;
  min?: number | null;
  max?: number | null;
  beforeValue?: number | null;
  beforeMin?: number | null;
  beforeMax?: number | null;
}
