import { patch } from 'api-browser';
import { Settings } from 'common';
import { toSettings } from 'common/settings';
import { FC, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Kbd } from 'ui/Kbd';
import { identity, isApple } from 'utils';
import { useSettings } from '../../hooks/useSettings';
import { OptionBox } from './OptionBox';

interface Props {
}

export const EneterSendField: FC<Props> = () => {
  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, boolean, typeof key> = useCallback(async (_, { arg: enterSend }) => {
    const settings: Settings = { enterSend };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.map(toSettings).unwrapOr({});
  }, []);
  const { trigger, isMutating } = useSWRMutation(key, updater, {
    populateCache: identity,
    revalidate: false,
  });
  const { data: settings } = useSettings();
  const enterSend = settings?.enterSend ?? false;
  const handleChange = (enterSend: boolean) => trigger(enterSend);
  const useCommand = isApple();
  const setEnterSend = () => {
    if (!enterSend) void handleChange(true);
  };
  const setCtrlEnterSend = () => {
    if (enterSend) void handleChange(false);
  };
  return (
    <div className="">
      <div className="pb-1">
        <FormattedMessage defaultMessage="Which key to use to send a message?" />
      </div>
      <OptionBox
        className="mb-1"
        active={enterSend}
        onClick={setEnterSend}
        disabled={isMutating}
      >
        <div>
          <FormattedMessage
            defaultMessage="Use the {enter} key to send messages"
            values={{ enter: <Kbd>Enter</Kbd> }}
          />
        </div>
        <div className="text-neutral-500 text-sm">
          <FormattedMessage
            defaultMessage="Use {key} to make a line break."
            values={{
              key: (
                <>
                  <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>
                </>
              ),
            }}
          />
        </div>
      </OptionBox>

      <OptionBox active={!enterSend} onClick={setCtrlEnterSend} disabled={isMutating}>
        <div>
          <FormattedMessage
            defaultMessage="Use {key} to send messages."
            values={{
              key: (
                <>
                  <Kbd>{useCommand ? '⌘' : 'Ctrl'}</Kbd> + <Kbd>Enter</Kbd>
                </>
              ),
            }}
          />
        </div>
      </OptionBox>
    </div>
  );
};
