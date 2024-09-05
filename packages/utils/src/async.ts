export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function timeout(ms: number): Promise<'TIMEOUT'> {
  return new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), ms));
}
