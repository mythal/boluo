import { css, keyframes } from '@emotion/react';
import { useNewVersion } from '../../hooks/useNewVersion';
import { flex, gap, spacingN, textSm } from '../../styles/atoms';
import Button from '../atoms/Button';
import InformationBar from './InformationBar';

const enter = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - ${spacingN(2)}));
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
`;

const position = css`
  position: fixed;
  z-index: 200;
  top: ${spacingN(2)};
  left: 50%;
  width: max-content;
  max-width: calc(100% - ${spacingN(4)});
  animation: ${enter} 160ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: translateX(-50%);
  }
`;

const content = css`
  ${[flex, gap(3), textSm]};
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
`;

export const NewVersionBanner = () => {
  const { available, dismiss } = useNewVersion();
  if (!available) return null;

  return (
    <div role="status" css={position}>
      <InformationBar variant="INFO" dismiss={dismiss}>
        <div css={content}>
          <span>菠萝有新版本可用。</span>
          <Button data-small data-variant="primary" onClick={() => location.reload()}>
            刷新页面
          </Button>
        </div>
      </InformationBar>
    </div>
  );
};
