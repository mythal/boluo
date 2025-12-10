import Link from 'next/link';
import { type FC, type ReactNode } from 'react';
import { UserOperations } from '../../../components/UserOperations';
import * as classes from '@boluo/ui/classes';
import { type Params } from '../../../server';
import { getIntl } from '@boluo/locale/server';

const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={[
        'bg-surface-raised border-border-raised shadow-1/2 max-w-lg rounded-sm border p-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

const Para: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return <p className={['py-1', className].join(' ')}>{children}</p>;
};

const NewsItem: FC<{ children: ReactNode }> = ({ children }) => {
  return <li className="py-1 text-sm">{children}</li>;
};

export default async function Page({ params }: { params: Promise<Params> }) {
  const intl = await getIntl(await params);
  return (
    <div className="grid grid-cols-1 grid-rows-[auto_auto_auto] gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="row-span-3">
        <Para className="text-sm">
          {intl.formatMessage({
            defaultMessage: 'A chat application designed specifically for playing RPGs.',
          })}
        </Para>
        <h1 className="py-2 text-center text-xl">
          {intl.formatMessage({ defaultMessage: 'Boluo' })}
        </h1>

        <div className="py-2">
          <div className="bg-surface-muted text-text-secondary flex h-20 w-full items-center justify-center italic">
            An Awesome Logo
          </div>
        </div>
      </Card>

      <Card>
        <UserOperations />
      </Card>
      <Card>
        <div className="font-bold">{intl.formatMessage({ defaultMessage: 'News' })}</div>
        <ul className="list-disc py-4 pl-4">
          <NewsItem>大量改进了界面，暗色模式还原了旧版的风格，请多多反馈意见！</NewsItem>
          <NewsItem>
            建立了
            <a
              href="https://zh.mythal.net"
              target="_blank"
              rel="noreferrer"
              className={classes.link}
            >
              新的论坛
            </a>
            ，可以在论坛里反馈问题和讨论了！（登录需要验证电子邮箱）
          </NewsItem>
          <NewsItem>
            非常遗憾，由于 boluo.chat 域名被墙了，国内访问域名改成{' '}
            <a
              className={classes.link}
              href="https://old.boluochat.com"
              target="_blank"
              rel="noreferrer"
            >
              boluochat.com
            </a>
            ，以后可以访问论坛获取最新消息。
          </NewsItem>
        </ul>
      </Card>
      <Card>
        <Para className="text-sm">
          {intl.formatMessage({
            defaultMessage:
              'This is the latest version of Boluo, which is still under active development. If you prefer the legacy version, please visit',
          })}{' '}
          <Link className={classes.link} href="https://old.boluochat.com">
            old.boluochat.com
          </Link>
        </Para>
      </Card>
    </div>
  );
}
