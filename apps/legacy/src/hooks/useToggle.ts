import { useReducer } from 'react';

const reducer = (prevState: boolean) => {
  return !prevState;
};

export function useToggle(initialValue: boolean): [boolean, () => void] {
  return useReducer(reducer, initialValue);
}
