import * as React from 'react';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { chatHeaderStyle, fontBold, p, textLg } from '@/styles/atoms';
import { Space } from '@/api/spaces';
import { useTitle } from '@/hooks';

const Header = styled.div(chatHeaderStyle);

const container = css`
  grid-column: list-start / list-end;
  grid-row: list-start / compose-end;
  ${[p(2)]};
`;

const SpaceName = styled.h1`
  ${[textLg, fontBold, p(0)]};
  margin: auto 0;
`;

const Description = styled.div`
  max-width: 30em;
`;

interface Props {
  space: Space;
}

function ChatHome({ space }: Props) {
  useTitle(space.name);
  return (
    <React.Fragment>
      <Header>
        <SpaceName>{space.name}</SpaceName>
      </Header>
      <div css={container}>
        <Description>{space.description}</Description>
      </div>
    </React.Fragment>
  );
}

export default ChatHome;
