import * as React from 'react';
import Loading from '@/components/molecules/Loading';
import styled from '@emotion/styled';

const Mask = styled.div`
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  text?: string;
}

function PageLoading({ text }: Props) {
  return (
    <Mask>
      <div css={{ width: '40%' }}>
        <Loading css={{ display: 'block' }} text={text} />
      </div>
    </Mask>
  );
}

export default PageLoading;
