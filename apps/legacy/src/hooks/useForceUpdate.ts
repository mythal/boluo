import { useCallback, useState } from 'react';

export function useForceUpdate() {
  const [, setValue] = useState(0); // integer state
  return useCallback(() => setValue((value) => value + 1), []); // update the state to force render
}
