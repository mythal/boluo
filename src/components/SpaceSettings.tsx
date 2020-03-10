import React, { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Input } from './Input';
import { checkDescription, checkDisplayName } from '../validators';
import { SelectDefaultDice } from './SelectDefaultDice';
import { post } from '../api/request';
import { Space } from '../api/spaces';
import { errorText } from '../api/error';

interface Props {
  space: Space;
  onEdited: () => void;
}

export const SpaceSettings = React.memo<Props>(({ space, onEdited }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>(space.name);
  const [description, setDescription] = useState<string>(space.description);
  const [defaultDiceType, setDefaultDiceType] = useState<string>(space.defaultDiceType);

  const [error, setError] = useState<string | null>(null);

  const nameError = checkDisplayName(name);
  const descriptionError = checkDescription(description);

  const dismiss = () => setOpen(false);

  const handleSetSpace = async () => {
    const result = await post('/spaces/edit', {
      spaceId: space.id,
      name,
      description,
      defaultDiceType,
    });
    if (result.isErr) {
      setError(errorText(result.value));
      return;
    }
    dismiss();
    onEdited();
  };
  const disabled = false;
  return (
    <>
      <button className="btn text-sm" onClick={() => setOpen(true)}>
        位面设置
      </button>

      <ConfirmDialog
        dismiss={dismiss}
        submit={handleSetSpace}
        open={open}
        confirmText="修改"
        error={error}
        disabled={disabled}
      >
        <div className="dialog-title">位面设置</div>

        <div>
          <Input value={name} onChange={setName} label="位面名" error={nameError.err()} />
          <Input value={description} onChange={setDescription} label="描述" error={descriptionError.err()} />

          <div className="my-2">
            <SelectDefaultDice value={defaultDiceType} setValue={setDefaultDiceType} />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
});
