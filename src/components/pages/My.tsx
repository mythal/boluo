import * as React from 'react';
import Title from '../atoms/Title';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import planetConquest from '../../assets/icons/planet-conquest.svg';
import newspaper from '../../assets/icons/newspaper.svg';
import Icon from '../atoms/Icon';
import { useSelector } from '../../store';
import styled from '@emotion/styled';
import { alignRight, link, mB, mT, spacingN } from '../../styles/atoms';
import { News } from '../atoms/News';
import ExternalLink from '../../components/atoms/ExternalLink';
import { Link } from 'react-router-dom';
import Text from '../atoms/Text';
import Button from '../atoms/Button';
import { useState } from 'react';
import Help from '../chat/Help';

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
          <Text>菠萝改动了骰子语法。增加了 CoC、WoD、Shadowrun 和 FATE 骰子指令。</Text>
          <div css={[alignRight, mT(2)]}>
            <Button data-small data-variant="primary" onClick={() => setHelp(true)}>
              查看快速参考
            </Button>
          </div>
        </News>
        <News>
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

        <News css={[mB(2)]}>
          <Text>
            管理员能够以 JSON 格式导出频道消息了{' '}
            <ExternalLink css={link} to="https://forum.boluo.chat/d/5">
              说明文档
            </ExternalLink>
            。
          </Text>
          <Text>「探索位面」只会显示那些在位面的设置中勾选了「在『探索位面』中列出」的位面。</Text>
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
