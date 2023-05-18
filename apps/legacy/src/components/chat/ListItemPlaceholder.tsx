import { css } from '@emotion/react';
import * as React from 'react';

const style = css`
  width: 100%;
  height: 100%;
`;

function ListItemPlaceholder() {
  return <div css={style} />;
}

export default ListItemPlaceholder;
