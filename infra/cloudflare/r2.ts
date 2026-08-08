import { r2Bucket } from './resources.js';

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
