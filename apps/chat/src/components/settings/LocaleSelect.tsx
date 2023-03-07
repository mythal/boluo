import { useLocale } from 'common';
import { toLocale } from 'common/locale';
import React, { useMemo } from 'react';
import { Select } from 'ui';

interface Props {
  id?: string;
  className?: string;
}

export const LocaleSelect: React.FC<Props> = ({ id }) => {
  const [locale, changeLocale] = useLocale();
  const handler = (value: string) => {
    changeLocale(toLocale(value));
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
  return <Select id={id} items={items} value={locale} onChange={handler} />;
};
