import type { Settings } from '@boluo/common/settings';
import React from 'react';

const emptySettings: Settings = {};

export const SettingsContext = React.createContext<Settings | null | undefined>(emptySettings);

export const useSettings = () => {
  return React.useContext(SettingsContext) || emptySettings;
};
