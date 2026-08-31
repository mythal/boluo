import * as React from 'react';
import { Link } from 'react-router-dom';
import Logo from '@boluo/icons/legacy/Logo';
import ExternalLink, { linkClassName } from '../../components/atoms/ExternalLink';
import Text from '../../components/atoms/Text';
import { isIe } from '../../utils/browser';
import { OutlineButtonLink } from '../atoms/OutlineButton';
import InformationBar from '../molecules/InformationBar';

function GuestHome() {
  return (
    <>
      <Logo className="mx-4 my-8 sm:float-right" width="14rem" height="14rem" />

      {isIe && (
        <InformationBar variant="WARNING">
          菠萝不支持这个浏览器，推荐使用 Chrome 浏览器。
        </InformationBar>
      )}
      <h1 className="legacy-guest-title">菠萝</h1>
      <h2 className="my-4 text-[1.125rem] font-normal not-italic">
        游玩
        <ruby>
          桌面角色扮演游戏<rt>Tabletop Role-Playing Game</rt>
        </ruby>
        、微酸香甜。
      </h2>
      <Text>
        <OutlineButtonLink to="/sign-up">立即加入</OutlineButtonLink>
      </Text>
      <Text className="my-2" textSize="small">
        已经<del className="text-legacy-gray-600">菠萝菠萝哒</del>有账号了？
        <Link className={linkClassName} to="/login">
          点此登录
        </Link>
      </Text>
      <h2 className="mt-8 text-[1.25rem]">为什么用菠萝？</h2>
      <ul className="list-[square]">
        <li>专门为文字网团而打造。</li>
        <li>可以看到别人输入中的文本，让文字交流像说话一样流畅。</li>
        <li>
          开放的
          <ExternalLink to="https://github.com/mythal/boluo">源代码</ExternalLink>和 API。
        </li>
        <li>即将到来的变量系统、回合指示器、战斗地图…</li>
      </ul>
      <Text>
        想要了解更多，也可以
        <ExternalLink to="https://zh.mythal.net/">访问菠萝讨论版</ExternalLink>。
      </Text>
      <Text className="mt-8" textSize="small">
        本站使用 <ExternalLink to="https://www.cloudflare.com/">Cloudflare</ExternalLink> 作为 CDN
        服务商。
      </Text>
    </>
  );
}

export default React.memo(GuestHome);
