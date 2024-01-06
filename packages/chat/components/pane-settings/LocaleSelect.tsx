import { useLocale } from 'common';
import { toLocale } from 'common/locale';
import React, { useMemo } from 'react';
import { Select } from 'ui/Select';

interface Props {
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const LocaleSelect: React.FC<Props> = ({ id, disabled = false }) => {
  const [locale, setLocale] = useLocale();
  const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    setLocale(toLocale(e.target.value));
  };
  const items = useMemo(
    () => [
      {
        value: 'en',
        label: 'English',
      },
      {
        value: 'zh-CN',
        label: '简体中文',
      },
      {
        value: 'ja',
        label: '日本語',
      },
    ],
    [],
  );
  return (
    <Select id={id} value={locale} onChange={onChange} disabled={disabled}>
      {items.map((item, key) => (
        <option key={key} value={item.value}>
          {item.label}
        </option>
      ))}
    </Select>
  );
};
