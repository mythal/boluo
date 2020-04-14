import React, { useRef } from 'react';

interface Props {
  value: string;
  onChange: (newColor: string) => void;
}

export const ColorPicker = React.memo<Props>(({ onChange, value }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleClick = () => {
    inputRef.current?.click();
  };
  return (
    <div className="" onClick={handleClick}>
      <input hidden type="color" ref={inputRef} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="btn-large text-sm inline-flex items-center">
        修改颜色
        <span className="inline-block w-4 h-4 ml-1 border border-green-600" style={{ backgroundColor: value }} />
      </button>
    </div>
  );
});
