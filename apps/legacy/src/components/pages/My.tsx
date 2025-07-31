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
          建立了
          <ExternalLink css={link} to="https://zh.mythal.net">
            新的论坛
          </ExternalLink>
          ，可以在论坛里反馈问题和讨论了！（登录需要验证电子邮箱）
        </News>

        <News css={[mB(2)]}>
          非常遗憾，由于 boluo.chat 域名被墙了，国内访问域名改成{' '}
          <ExternalLink css={link} to="https://old.boluochat.com">
            boluochat.com
          </ExternalLink>
          ，以后可以访问论坛获取最新消息。
        </News>

        <News css={[mB(2)]}>
          现在会根据延迟自动选择线路，改进了断线重连。重写的
          <ExternalLink css={link} to="https://site.boluochat.com">
            新版菠萝
          </ExternalLink>
          可以试用。
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
