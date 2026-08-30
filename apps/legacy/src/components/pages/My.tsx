import * as React from 'react';
import { useState } from 'react';
import Newspaper from '@boluo/icons/legacy/Newspaper';
import PlanetConquest from '@boluo/icons/legacy/PlanetConquest';
import ExternalLink from '../../components/atoms/ExternalLink';
import { useSelector } from '../../store';
import Icon from '../atoms/Icon';
import { News } from '../atoms/News';
import { SpaceGrid } from '../atoms/SpaceGrid';
import Text from '../atoms/Text';
import Title from '../atoms/Title';
import Help from '../chat/Help';
import NewSpaceCard from '../organisms/NewSpaceCard';
import SpaceCard from '../organisms/SpaceCard';

function My() {
  const spaces = useSelector((state) => state.profile!.spaces);
  const cards = spaces.valueSeq().map(({ space }) => <SpaceCard key={space.id} space={space} />);
  const [showHelp, setHelp] = useState(false);
  return (
    <div className="grid grid-cols-[70%_30%] gap-2">
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

        <News className="mb-2">
          <ExternalLink to="https://site.boluochat.com">新版菠萝</ExternalLink>
          现在有接近旧版的暗色主题和更多功能了，欢迎试用！
        </News>

        <News className="mb-2">
          建立了
          <ExternalLink to="https://zh.mythal.net">新的论坛</ExternalLink>
          ，可以在论坛里反馈问题和讨论了！（登录需要验证电子邮箱）
        </News>

        <News className="mb-2">
          非常遗憾，由于 boluo.chat 域名被墙了，国内访问域名改成{' '}
          <ExternalLink to="https://old.boluochat.com">boluochat.com</ExternalLink>
          ，以后可以访问论坛获取最新消息。
        </News>
      </div>
      {showHelp && <Help dismiss={() => setHelp(false)} />}
    </div>
  );
}

export default My;
