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
import d20 from '../../assets/icons/d20.svg';
import { codeBlockStyle } from '../chat/styles';

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
          <Text>
            菠萝上线啦！现在是早期测试阶段，请到
            <ExternalLink to="https://forum.boluo.chat/" css={link}>
              讨论版
            </ExternalLink>
            或「
            <Link to="/space/sKPHfPhpEeqCXBcv8xDXgA" css={link}>
              菠萝讨论
            </Link>
            」位面提出你的意见和建议。
          </Text>

          <Text>
            功能测试可以到
            <Link css={link} to="/space/j~E-cNonEeqMopvAttbC8g">
              沙盒位面
            </Link>
            。管理员将不定期删除没有实质内容的测试位面。
          </Text>
        </News>
        <News css={[mB(2)]}>新增非公开位面，只能通过邀请链接加入。请在位面设置中设定。</News>
        <News css={[mB(2)]}>
          <Text>
            可以在频道设置里面指定「
            <Icon sprite={d20} /> 插入骰子」按钮插入的默认指令。
          </Text>
          <Text>可以搜索位面和删除位面了。</Text>
        </News>
        <News css={[mB(2)]}>
          <pre css={codeBlockStyle}>{'代码块 想使用\n现在是 格式是\n很酷的 ```内\n像素体 容```'}</pre>
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </Container>
  );
}

export default My;
