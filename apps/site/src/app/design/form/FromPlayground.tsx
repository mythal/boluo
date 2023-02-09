'use client';

import { useState } from 'react';
import { Label, Select, Switch, TextArea, TextInput } from 'ui';

const items = [
  { label: 'Papika', value: 'papika' },
  { label: 'Yayaka', value: 'yayaka' },
  { label: 'Cocona', value: 'cocona' },
];

export const FormPlayground = () => {
  const [disabled, setDisabled] = useState(false);
  const [item, setItem] = useState<string>('papika');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl mb-4">Text Input</h2>
        <div className="flex gap-2 flex-col">
          <div>
            <Label className="inline-flex gap-4 items-center">
              Disable?
              <Switch checked={disabled} onChange={setDisabled} />
            </Label>
          </div>
          <TextInput disabled={disabled} placeholder="Default" />
          <TextInput disabled={disabled} placeholder="Default" data-state="error" />
          <TextInput disabled={disabled} placeholder="Default" data-state="warning" />
        </div>
      </div>

      <div>
        <h2 className="text-xl mb-4">Select</h2>
        <Select items={items} value={item} onChange={setItem} />
      </div>
      <div>
        <h2 className="text-xl my-4">Text Area</h2>
        <div className="flex gap-2 flex-col">
          <TextArea />
        </div>
      </div>
    </div>
  );
};
