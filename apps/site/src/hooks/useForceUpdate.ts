import { useCallback, useState } from 'react';
import { not } from '../helper/function';

export function useForceUpdate() {
  const [, trigger] = useState(false);
  return useCallback(() => trigger(not), []); // update the state to force render
}
