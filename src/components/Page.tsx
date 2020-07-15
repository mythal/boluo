import React, { useState } from 'react';
import { useProfile } from './Provider';
import { bgColor, fontBase, headerHeight, sidebarMaxWidth, sidebarMinWidth, textColor } from '../styles/theme';
import { css, Global } from '@emotion/core';
import 'modern-normalize/modern-normalize.css';

interface Props {}

const baseStyle = css`
  html {
    font-size: 14px;
    font-family: ${fontBase};
    background-color: ${bgColor};
    color: ${textColor};
  }
`;

const gridStyle = css`
  display: grid;
  height: 100vh;
  grid-template-columns: minmax(${sidebarMinWidth}, ${sidebarMaxWidth}) auto;
  grid-template-rows: ${headerHeight} auto;
  grid-template-areas:
    'left-header right-header'
    'sidebar content';

  &[data-sidebar='false'] {
    grid-template-areas:
      'left-header right-header'
      'content content';
  }
`;

export const Page: React.FC<Props> = () => {
  const profile = useProfile();
  const [sidebar, setSidebar] = useState(Boolean(profile));
  return (
    <div css={gridStyle} data-sidebar={sidebar}>
      <Global styles={baseStyle} />
      <div
        css={css`
          grid-area: left-header;
        `}
      >
        <input type="checkbox" checked={sidebar} onChange={(e) => setSidebar(e.target.checked)} />
      </div>
      <div
        css={css`
          grid-area: right-header;
        `}
      >
        right-header
      </div>
      {sidebar && (
        <div
          css={css`
            grid-area: sidebar;
          `}
        >
          sidebar
        </div>
      )}
      <div
        css={css`
          grid-area: content;
        `}
      >
        content
      </div>
    </div>
  );
};
