export interface Configuration {
  app: 'site' | 'spa' | 'unknown';
  development: boolean;
  mediaUrl: string;
}

let configuration: Configuration | undefined;

export function setConfiguration(newConfiguration: Configuration): void {
  configuration = newConfiguration;
}

export function getConfiguration(): Configuration {
  if (configuration == null) {
    throw new Error('Configuration not found');
  }
  return configuration;
}
