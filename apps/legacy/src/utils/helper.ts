export function compare(a: number, b: number): number {
  return b - a;
}

export function compareRev(a: number, b: number): number {
  return a - b;
}

export function parseDateString(dateString: string): Date {
  return new Date(dateString);
}
