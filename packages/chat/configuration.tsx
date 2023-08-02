import React from 'react';

export interface Configuration {
  app: 'site' | 'spa' | 'unknown';
  mediaPublicUrl: string;
  development: boolean;
}

export const ConfigurationContext = React.createContext<Configuration>({
  app: 'unknown',
  mediaPublicUrl: '',
  development: false,
});
