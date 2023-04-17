export function by(a: number, b: number): number {
  return b - a;
}

export function byReverse(a: number, b: number): number {
  return a - b;
}

export function byPos(a: { pos: number }, b: { pos: number }): number {
  return a.pos - b.pos;
}
