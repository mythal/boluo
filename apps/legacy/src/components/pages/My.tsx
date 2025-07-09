import styled from '@emotion/styled';
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Newspaper from '../../assets/icons/newspaper.svg';
import PlanetConquest from '../../assets/icons/planet-conquest.svg';
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
          <Icon icon={PlanetConquest} /> 我在的位面
        </Title>
        <SpaceGrid>
          <NewSpaceCard />
          {cards}
        </SpaceGrid>
      </div>
      <div>
        <Title>
          <Icon icon={Newspaper} /> 新闻
        </Title>
        <News css={[mB(2)]}>
          现在会根据延迟自动选择线路，改进了断线重连。重写的
          <ExternalLink css={link} to="https://next.boluo.chat">
            新版菠萝
          </ExternalLink>
          可以试用。
        </News>
        <News css={[mB(2)]}>
          如果有什么问题可以到QQ群（1107382038）反馈，也可以提交{' '}
          <ExternalLink css={link} to="https://github.com/mythal/boluo/issues">
            GitHub Issues
          </ExternalLink>
          ，或者直接给我发邮件：<Code>admin@boluo.chat</Code>。
        </News>
        <News css={[mB(2)]}>
          导出功能现在可以选择时间，导出最近的消息了。切换游戏内外的按键改为<code>Esc</code>键。
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
