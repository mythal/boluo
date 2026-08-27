import { zoneList, zones } from './config.js';
import { manageZone, manageZones } from './resources.js';

const zonePair = manageZones(zoneList);
const boluochatCom = manageZone(zones.boluochatCom);

boluochatCom.workersCustomDomain('avatars', {
  hostname: 'avatars.boluochat.com',
  service: 'boluo-avatars',
});

zonePair.workersCustomDomain('site', ({ hostname }) => ({
  hostname: hostname('site'),
  service: 'boluo-site-production',
}));

zonePair.workersCustomDomain('next', ({ hostname }) => ({
  hostname: hostname('next'),
  service: 'boluo-site-production',
}));

zonePair.workersCustomDomain('app', ({ hostname }) => ({
  hostname: hostname('app'),
  service: 'boluo-app-production',
}));

zonePair.workersCustomDomain('old', ({ hostname }) => ({
  hostname: hostname('old'),
  service: 'boluo-legacy-production',
}));
