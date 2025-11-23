import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneBox } from './PaneBox';
import * as classes from '@boluo/ui/classes';
import { PaneHeaderBox } from './PaneHeaderBox';
import { GreetingHeader } from './GreetingHeader';

export const PaneWelcome: FC = () => {
  return (
    <PaneBox
      initSizeLevel={1}
      header={
        <PaneHeaderBox>
          <FormattedMessage defaultMessage="Welcome" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane">
        <GreetingHeader />
        <p className="pt-8 pb-2">
          <FormattedMessage defaultMessage="This is Boluo, a chat app designed for tabletop roleplaying games." />
        </p>
        <p className="py-2">
          <FormattedMessage
            defaultMessage="The forum is available at {forumUrl} (Chinese only for now), you can feedback issues and discuss there."
            values={{
              forumUrl: (
                <a
                  key="forumUrl"
                  href="https://zh.mythal.net"
                  target="_blank"
                  rel="noreferrer"
                  className={classes.link}
                >
                  zh.mythal.net
                </a>
              ),
            }}
          />
        </p>
        <p className="py-2">
          <FormattedMessage
            defaultMessage="You can find the source code at {githubUrl}."
            values={{
              githubUrl: (
                <a
                  key="githubUrl"
                  href="https://github.com/mythal/boluo"
                  target="_blank"
                  rel="noreferrer"
                  className={classes.link}
                >
                  github.com/mythal/boluo
                </a>
              ),
            }}
          />
        </p>
      </div>
    </PaneBox>
  );
};
