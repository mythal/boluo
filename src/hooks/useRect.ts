/* eslint-disable react-hooks/exhaustive-deps */
// source: https://github.com/tannerlinsley/react-virtual/blob/master/src/useRect.js
import React, { useLayoutEffect, useRef } from 'react';
import { ResizeObserver as Polyfill } from '@juggle/resize-observer';
const ResizeObserver = window.ResizeObserver || Polyfill;

export function useRect<T extends Element>(nodeRef: React.RefObject<T>): DOMRect | null {
  const [element, setElement] = React.useState(nodeRef.current);
  const [rect, dispatch] = React.useReducer(rectReducer, null);
  const initialRectSet = React.useRef(false);

  useLayoutEffect(() => {
    if (nodeRef.current !== element) {
      setElement(nodeRef.current);
    }
  });

  useLayoutEffect(() => {
    if (element && !initialRectSet.current) {
      initialRectSet.current = true;
      const rect = element.getBoundingClientRect();
      dispatch({ rect });
    }
  }, [element]);

  const timeout = useRef<number | undefined>();

  React.useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => {
          dispatch({ rect: entry.contentRect });
        }, 200);
      }
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      window.clearTimeout(timeout.current);
    };
  }, [element]);

  return rect;
}

function rectReducer(state: DOMRect | null, action: { rect: DOMRect }): DOMRect | null {
  const rect = action.rect;
  if (!state || state.height !== rect.height || state.width !== rect.width) {
    return rect;
  }
  return state;
}
