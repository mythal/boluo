import { connectStateAtom, useSpaceConnection } from '../../hooks/useSpaceConnection';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai/utils';
import { css } from '@emotion/core';
import React from 'react';
import { spacingN } from '../../styles/atoms';

export const style = css`
  z-index: 999;
  position: fixed;
  top: ${spacingN(2)};
  right: ${spacingN(2)};
  padding: ${spacingN(2)};
  background-color: aqua;
  color: #1a202c;
`;

export const Connector = () => {
  const connect = useSpaceConnection();
  const [retryCounter, setRetryCounter] = useState(0);
  useEffect(() => {
    connect();
  }, [connect]);
  const connectionState = useAtomValue(connectStateAtom);
  useEffect(() => {
    if (connectionState === 'CLOSED') {
      if (retryCounter === 0) {
        connect()
          .then(() => {
            console.log('successful create a websocket connection');
          })
          .catch(() => {
            setRetryCounter(5);
          });
      } else {
        const handle = window.setTimeout(() => {
          setRetryCounter((counter) => counter - 1);
        }, 1000);
        return () => window.clearTimeout(handle);
      }
    }
  }, [connectionState, retryCounter]);
  if (connectionState === 'OPEN') {
    return null;
  }
  let text: string;
  if (connectionState === 'CLOSED') {
    return <div css={style}>链接出错，等待重连 ({retryCounter})</div>;
  }
  return <div css={style}>连接中……</div>;
};
