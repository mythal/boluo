import styled from '@emotion/styled';
import * as React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.svg';
import ExternalLink from '../../components/atoms/ExternalLink';
import Text from '../../components/atoms/Text';
import {
  color,
  floatRight,
  fontNormal,
  link,
  listStyleSquare,
  mT,
  mX,
  mY,
  sm,
  text3Xl,
  textLg,
  textSm,
  textXl,
} from '../../styles/atoms';
import { gray } from '../../styles/colors';
import { isIe } from '../../utils/browser';
import { OutlineButtonLink } from '../atoms/OutlineButton';
import InformationBar from '../molecules/InformationBar';

const Title = styled.h1`
  ${[text3Xl, fontNormal]};
`;

const SubTitle = styled.h2`
  ${[textLg, fontNormal, mY(4)]};
`;

function GuestHome() {
  return (
    <>
      <Logo css={[mY(8), sm(floatRight), mX(4)]} width="14rem" height="14rem" />

      {isIe && (
        <InformationBar variant="WARNING">
          菠萝不支持这个浏览器，推荐使用 Chrome 浏览器。
        </InformationBar>
      )}
      <Title>菠萝</Title>
      <SubTitle>
        游玩
        <ruby>
          桌面角色扮演游戏<rt>Tabletop Role-Playing Game</rt>
        </ruby>
        、微酸香甜。
      </SubTitle>
      <Text>
        <OutlineButtonLink to="/sign-up">立即加入</OutlineButtonLink>
      </Text>
      <Text css={[textSm, mY(2)]}>
        已经<del css={color(gray['600'])}>菠萝菠萝哒</del>有账号了？
        <Link css={link} to="/login">
          点此登录
        </Link>
      </Text>
      <h2 css={[textXl, mT(8)]}>为什么用菠萝？</h2>
      <ul css={listStyleSquare}>
        <li>专门为文字网团而打造。</li>
        <li>可以看到别人输入中的文本，让文字交流像说话一样流畅。</li>
        <li>
          开放的
          <ExternalLink css={link} to="https://github.com/mythal/boluo">
            源代码
          </ExternalLink>
          和 API。
        </li>
        <li>即将到来的变量系统、回合指示器、战斗地图…</li>
      </ul>
      <Text>
        想要了解更多，也可以
        <ExternalLink to="https://forum.boluo.chat/" css={link}>
          访问菠萝讨论版
        </ExternalLink>
        。
      </Text>
      <Text css={[textSm, mT(8)]}>
        本站使用{' '}
        <ExternalLink to="https://www.cloudflare.com/" css={link}>
          Cloudflare
        </ExternalLink>{' '}
        作为 CDN 服务商。
      </Text>
    </>
  );
}

export default React.memo(GuestHome);
