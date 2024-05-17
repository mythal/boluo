import { Settings } from '@boluo/common';
import React from 'react';

const emptySettings: Settings = {};

export const SettingsContext = React.createContext<Settings | null | undefined>(emptySettings);

export const useSettings = () => {
  return React.useContext(SettingsContext) || emptySettings;
};
