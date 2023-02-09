import styled from '@emotion/styled';
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import newspaper from '../../assets/icons/newspaper.svg';
import planetConquest from '../../assets/icons/planet-conquest.svg';
import ExternalLink from '../../components/atoms/ExternalLink';
import { useSelector } from '../../store';
import { link, mB, spacingN } from '../../styles/atoms';
import { Code } from '../atoms/Code';
import Icon from '../atoms/Icon';
import { News } from '../atoms/News';
import { SpaceGrid } from '../atoms/SpaceGrid';
import Text from '../atoms/Text';
import Title from '../atoms/Title';
import Help from '../chat/Help';
import NewSpaceCard from '../organisms/NewSpaceCard';
import SpaceCard from '../organisms/SpaceCard';

const Container = styled.div`
  display: grid;
  grid-template-columns: 70% 30%;
  gap: ${spacingN(2)};
`;

function My() {
  const spaces = useSelector((state) => state.profile!.spaces);
  const cards = spaces.valueSeq().map(({ space }) => <SpaceCard key={space.id} space={space} />);
  const [showHelp, setHelp] = useState(false);
  return (
    <Container>
      <div>
        <Title>
          <Icon sprite={planetConquest} /> 我在的位面
        </Title>
        <SpaceGrid>
          <NewSpaceCard />
          {cards}
        </SpaceGrid>
      </div>
      <div>
        <Title>
          <Icon sprite={newspaper} /> 新闻
        </Title>
        <News css={[mB(2)]}>加回了多窗格功能，抱歉迟了很久。</News>
        <News css={[mB(2)]}>能够找回密码了</News>
        <News css={[mB(2)]}>
          增加了消息通知功能，底层改动比较大，现在可能会有一些 Bug，可以到QQ群（1107382038）反馈。
        </News>
        <News css={[mB(2)]}>
          导出功能现在可以选择时间，导出最近的消息了。切换游戏内外的按键改为<code>Esc</code>键。
          增加了网络连不上时候的备用线路 <Code>https://cdn.boluo.chat/</Code>。
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
