import * as React from 'react';
import { useState } from 'react';
import Title from '../atoms/Title';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import planetConquest from '../../assets/icons/planet-conquest.svg';
import newspaper from '../../assets/icons/newspaper.svg';
import Icon from '../atoms/Icon';
import { useSelector } from '../../store';
import styled from '@emotion/styled';
import { link, mB, spacingN } from '../../styles/atoms';
import { News } from '../atoms/News';
import ExternalLink from '../../components/atoms/ExternalLink';
import { Link } from 'react-router-dom';
import Text from '../atoms/Text';
import Help from '../chat/Help';
import { Code } from '../atoms/Code';

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

        <News css={[mB(2)]}>
          <Text>现在可以搜索位面和删除位面了。</Text>
        </News>
        <News css={[mB(2)]}>测试新的消息列表，如果更喜欢原来的请告诉我。</News>
        <News css={[mB(2)]}>
          <Text>
            增加了代码和代码块 Markdown 格式支持 <Code>`{'{d20}'}` ```代码块```</Code>
          </Text>
        </News>

        <News css={[mB(2)]}>
          <Text>
            菠萝上线啦！现在是早期测试阶段，请到
            <ExternalLink to="https://forum.boluo.chat/" css={link}>
              讨论版
            </ExternalLink>
            提出意见和建议。
          </Text>

          <Text>
            可以到
            <Link css={link} to="/space/j~E-cNonEeqMopvAttbC8g">
              沙盒位面
            </Link>
            去测试功能。
          </Text>
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
