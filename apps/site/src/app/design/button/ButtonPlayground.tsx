'use client';

import { Fairy } from 'boluo-icons';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button, Icon, Label, RefreshButton, Spinner, Switch } from 'ui';

export const ButtonPlayground: FC = () => {
  const [disabled, setDisabled] = useState(false);
  const [small, setSmall] = useState(true);
  const [icon, setIcon] = useState(false);
  return (
    <div>
      <div className="flex gap-4">
        <Label className="inline-flex gap-4 items-center">
          Disable?
          <Switch checked={disabled} onChange={setDisabled} />
        </Label>

        <Label className="inline-flex gap-4 items-center">
          Small?
          <Switch checked={small} onChange={setSmall} />
        </Label>

        <Label className="inline-flex gap-4 items-center">
          Icon?
          <Switch checked={icon} onChange={setIcon} />
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="mt-4">
          <Button disabled={disabled} data-small={small}>{icon && <Icon icon={Fairy} />}Button</Button>
        </div>
        <div>
          <Button disabled={disabled} data-small={small} data-type="primary">
            {icon && <Spinner />}Primary
          </Button>
        </div>
        <div>
          <RefreshButton>
            <FormattedMessage defaultMessage="Refresh" />
          </RefreshButton>
        </div>
      </div>
    </div>
  );
};
