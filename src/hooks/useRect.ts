/* eslint-disable react-hooks/exhaustive-deps */
// source: https://github.com/tannerlinsley/react-virtual/blob/master/src/useRect.js
import React, { useLayoutEffect, useRef } from 'react';

import observeRect from '@reach/observe-rect';

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

    const observer = observeRect(element, (rect) => {
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
        dispatch({ rect });
      }, 200);
    });

    observer.observe();

    return () => {
      observer.unobserve();
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
