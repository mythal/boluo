import React, { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Kbd } from '@boluo/ui/Kbd';
import { isApple } from '@boluo/utils/browser';
import { useSettings } from '../../hooks/useSettings';
import { SelectBox } from '@boluo/ui/SelectBox';
import { useMutateSettings } from '@boluo/hooks/useMutateSettings';

export const EneterSendField: FC = () => {
  const { trigger: updateSettings } = useMutateSettings();
  const settings = useSettings();
  const enterSend = settings.enterSend ?? false;
  const handleChange = (enterSend: boolean) =>
    updateSettings(
      { enterSend },
      { optimisticData: (current) => ({ ...(current ?? {}), enterSend }) },
    );
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
            values={{ enter: <Kbd key="enter">Enter</Kbd> }}
          />
        }
        description={
          <FormattedMessage
            defaultMessage="Use {key} to make a line break."
            values={{
              key: (
                <React.Fragment key="key-indicator">
                  <Kbd variant="small">Shift</Kbd>
                  <span> + </span>
                  <Kbd variant="small">↵</Kbd>
                </React.Fragment>
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
                <React.Fragment key="key-indicator">
                  <Kbd>{useCommand ? '⌘' : 'Ctrl'}</Kbd>
                  <span> + </span>
                  <Kbd>↵</Kbd>
                </React.Fragment>
              ),
            }}
          />
        }
      />
    </div>
  );
};
