import { zones } from './config.js';
import { r2Bucket, r2BucketLifecycle, r2CustomDomain } from './resources.js';

r2Bucket('boluo', {
  jurisdiction: 'default',
  location: 'APAC',
  name: 'boluo',
  storageClass: 'Standard',
});

r2Bucket('boluo-backup', {
  jurisdiction: 'default',
  location: 'APAC',
  name: 'boluo-backup',
  storageClass: 'InfrequentAccess',
});

r2Bucket('boluo-development', {
  jurisdiction: 'default',
  location: 'APAC',
  name: 'boluo-development',
  storageClass: 'Standard',
});

const HISTORY_RETENTION_SECONDS = 180 * 24 * 60 * 60;

const sourceMaps = r2Bucket('boluo-source-maps', {
  jurisdiction: 'default',
  location: 'APAC',
  name: 'boluo-source-maps',
  storageClass: 'Standard',
});

r2BucketLifecycle('boluo-source-maps', {
  bucketName: sourceMaps.name,
  jurisdiction: 'default',
  rules: [
    {
      id: 'Move source maps to infrequent access after 30 days',
      conditions: { prefix: '' },
      enabled: true,
      storageClassTransitions: [
        {
          condition: { maxAge: 30 * 24 * 60 * 60, type: 'Age' },
          storageClass: 'InfrequentAccess',
        },
      ],
    },
    {
      id: 'Delete source maps after one year',
      conditions: { prefix: '' },
      enabled: true,
      deleteObjectsTransition: {
        condition: { maxAge: 365 * 24 * 60 * 60, type: 'Age' },
      },
    },
  ],
});

r2CustomDomain('boluo-source-maps', {
  bucketName: sourceMaps.name,
  domain: 'sourcemaps.boluo.chat',
  enabled: true,
  jurisdiction: 'default',
  minTls: '1.2',
  zoneId: zones.boluoChat.id,
});

const historyFiles = r2Bucket('boluo-history-files', {
  jurisdiction: 'default',
  location: 'APAC',
  name: 'boluo-history-files',
  storageClass: 'Standard',
});

r2BucketLifecycle('boluo-history-files', {
  bucketName: historyFiles.name,
  jurisdiction: 'default',
  rules: [
    {
      id: 'Move history files to infrequent access after 30 days',
      conditions: { prefix: '' },
      enabled: true,
      storageClassTransitions: [
        {
          condition: { maxAge: 30 * 24 * 60 * 60, type: 'Age' },
          storageClass: 'InfrequentAccess',
        },
      ],
    },
    {
      id: 'Delete history files after 180 days',
      conditions: { prefix: '' },
      enabled: true,
      deleteObjectsTransition: {
        condition: { maxAge: HISTORY_RETENTION_SECONDS, type: 'Age' },
      },
    },
  ],
});
