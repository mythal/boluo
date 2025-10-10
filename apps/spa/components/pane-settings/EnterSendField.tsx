import { patch } from '@boluo/api-browser';
import type { Settings } from '@boluo/common/settings';
import { toSettings } from '@boluo/common/settings';
import { type FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Kbd } from '@boluo/ui/Kbd';
import { identity } from '@boluo/utils/function';
import { isApple } from '@boluo/utils/browser';
import { useSettings } from '../../hooks/useSettings';
import { SelectBox } from '@boluo/ui/SelectBox';

export const EneterSendField: FC = () => {
  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, typeof key, boolean> = useCallback(
    async (_, { arg: enterSend }) => {
      const settings: Settings = { enterSend };
      const settingsResult = await patch('/users/update_settings', null, settings);
      return settingsResult.map(toSettings).unwrapOr({});
    },
    [],
  );
  const { trigger } = useSWRMutation(key, updater, {
    populateCache: identity,
    rollbackOnError: true,
    revalidate: false,
  });
  const settings = useSettings();
  const enterSend = settings.enterSend ?? false;
  const handleChange = (enterSend: boolean) => trigger(enterSend);
  const useCommand = isApple();
  const setEnterSend = () => {
    if (!enterSend) void handleChange(true);
  };
  const setCtrlEnterSend = () => {
    if (enterSend) void handleChange(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="">
        <FormattedMessage defaultMessage="Which key to use to send a message?" />
      </div>
      <SelectBox
        selected={enterSend}
        onSelected={setEnterSend}
        title={
          <FormattedMessage
            defaultMessage="Use the {enter} key to send messages"
            values={{ enter: <Kbd>Enter</Kbd> }}
          />
        }
        description={
          <FormattedMessage
            defaultMessage="Use {key} to make a line break."
            values={{
              key: (
                <>
                  <Kbd variant="small">Shift</Kbd>
                  <span> + </span>
                  <Kbd variant="small">↵</Kbd>
                </>
              ),
            }}
          />
        }
      />

      <SelectBox
        selected={!enterSend}
        onSelected={setCtrlEnterSend}
        title={
          <FormattedMessage
            defaultMessage="Use {key} to send messages"
            values={{
              key: (
                <>
                  <Kbd>{useCommand ? '⌘' : 'Ctrl'}</Kbd>
                  <span> + </span>
                  <Kbd>↵</Kbd>
                </>
              ),
            }}
          />
        }
      />
    </div>
  );
};
