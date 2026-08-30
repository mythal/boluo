import * as React from 'react';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ref: React.Ref<HTMLInputElement>;
}

function ColorPicker({ value, onChange, id, ref }: Props) {
  return (
    <>
      <label htmlFor={id}>
        <div
          className="h-10 rounded-[1px] [box-shadow:0_0_2px_var(--color-legacy-black)_inset]"
          style={{ backgroundColor: value }}
        />
      </label>
      <input
        id={id}
        type="color"
        onChange={(event) => onChange(event.target.value)}
        ref={ref}
        hidden
      />
    </>
  );
}

export default ColorPicker;
