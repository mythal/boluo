import * as cloudflare from '@pulumi/cloudflare';
import type * as pulumi from '@pulumi/pulumi';

import { accountId, type ZoneConfig, type ZoneResourceKey } from './config.js';

type DnsRecordArgs = Omit<cloudflare.DnsRecordArgs, 'ttl' | 'zoneId'> & {
  readonly ttl?: cloudflare.DnsRecordArgs['ttl'];
};

interface ZoneContext {
  readonly hostname: (relativeName?: string) => string;
  readonly select: <T>(values: Readonly<Record<ZoneResourceKey, T>>) => T;
  readonly zone: ZoneConfig;
}

type PerZone<T extends object> = T | ((context: ZoneContext) => T);

function toKebabCase(value: string): string {
  return value.replaceAll('_', '-');
}

function createZoneContext(zone: ZoneConfig): ZoneContext {
  return {
    hostname(relativeName = '') {
      return relativeName ? `${relativeName}.${zone.name}` : zone.name;
    },
    select(values) {
      return values[zone.resourceKey];
    },
    zone,
  };
}

function resolvePerZone<T extends object>(value: PerZone<T>, context: ZoneContext): T {
  return typeof value === 'function' ? value(context) : value;
}

export function manageZone(zoneConfig: ZoneConfig) {
  const zoneKey = toKebabCase(zoneConfig.resourceKey);

  return {
    zone(args: Omit<cloudflare.ZoneArgs, 'account' | 'name'> = {}) {
      const name = `zone-${zoneKey}`;
      return new cloudflare.Zone(
        name,
        {
          type: 'full',
          ...args,
          account: { id: accountId },
          name: zoneConfig.name,
        },
        { protect: true },
      );
    },

    dnsRecord(identity: string, args: DnsRecordArgs) {
      const name = `dns-${zoneKey}-${toKebabCase(identity)}`;
      return new cloudflare.DnsRecord(name, {
        ttl: 1,
        ...args,
        zoneId: zoneConfig.id,
      });
    },

    zoneSetting(identity: string, args: Omit<cloudflare.ZoneSettingArgs, 'zoneId'>) {
      const name = `zone-setting-${zoneKey}-${toKebabCase(identity)}`;
      return new cloudflare.ZoneSetting(name, {
        ...args,
        zoneId: zoneConfig.id,
      });
    },

    ruleset(identity: string, args: Omit<cloudflare.RulesetArgs, 'accountId' | 'kind' | 'zoneId'>) {
      const name = `ruleset-${zoneKey}-${toKebabCase(identity)}`;
      return new cloudflare.Ruleset(name, {
        ...args,
        kind: 'zone',
        zoneId: zoneConfig.id,
      });
    },

    workersCustomDomain(
      identity: string,
      args: Omit<cloudflare.WorkersCustomDomainArgs, 'accountId' | 'zoneId' | 'zoneName'>,
    ) {
      const name = `worker-domain-${zoneKey}-${toKebabCase(identity)}`;
      return new cloudflare.WorkersCustomDomain(name, {
        ...args,
        accountId,
        zoneId: zoneConfig.id,
        zoneName: zoneConfig.name,
      });
    },
  };
}

export function manageZones(zoneConfigs: readonly ZoneConfig[]) {
  const entries = zoneConfigs.map((zoneConfig) => ({
    context: createZoneContext(zoneConfig),
    resources: manageZone(zoneConfig),
  }));

  return {
    zones() {
      return entries.map(({ resources }) => resources.zone());
    },

    dnsRecord(identity: string, args: PerZone<DnsRecordArgs>) {
      return entries.map(({ context, resources }) =>
        resources.dnsRecord(identity, resolvePerZone(args, context)),
      );
    },

    zoneSetting(identity: string, args: PerZone<Omit<cloudflare.ZoneSettingArgs, 'zoneId'>>) {
      return entries.map(({ context, resources }) =>
        resources.zoneSetting(identity, resolvePerZone(args, context)),
      );
    },

    ruleset(
      identity: string,
      args: PerZone<Omit<cloudflare.RulesetArgs, 'accountId' | 'kind' | 'zoneId'>>,
    ) {
      return entries.map(({ context, resources }) =>
        resources.ruleset(identity, resolvePerZone(args, context)),
      );
    },

    workersCustomDomain(
      identity: string,
      args: PerZone<Omit<cloudflare.WorkersCustomDomainArgs, 'accountId' | 'zoneId' | 'zoneName'>>,
    ) {
      return entries.map(({ context, resources }) =>
        resources.workersCustomDomain(identity, resolvePerZone(args, context)),
      );
    },
  };
}

export function r2Bucket(identity: string, args: Omit<cloudflare.R2BucketArgs, 'accountId'>) {
  const name = `r2-bucket-${toKebabCase(identity)}`;
  return new cloudflare.R2Bucket(
    name,
    {
      ...args,
      accountId,
    },
    { protect: true },
  );
}

export function r2BucketLifecycle(
  identity: string,
  args: Omit<cloudflare.R2BucketLifecycleArgs, 'accountId'>,
) {
  const name = `r2-bucket-lifecycle-${toKebabCase(identity)}`;
  return new cloudflare.R2BucketLifecycle(name, {
    ...args,
    accountId,
  });
}

export function r2BucketCors(
  identity: string,
  args: Omit<cloudflare.R2BucketCorsArgs, 'accountId'>,
) {
  const name = `r2-bucket-cors-${toKebabCase(identity)}`;
  return new cloudflare.R2BucketCors(name, {
    ...args,
    accountId,
  });
}

export function r2CustomDomain(
  identity: string,
  args: Omit<cloudflare.R2CustomDomainArgs, 'accountId'>,
) {
  const name = `r2-custom-domain-${toKebabCase(identity)}`;
  return new cloudflare.R2CustomDomain(name, {
    ...args,
    accountId,
  });
}

export function tunnel(
  identity: string,
  args: Omit<cloudflare.ZeroTrustTunnelCloudflaredArgs, 'accountId'>,
  options: pulumi.CustomResourceOptions = {},
) {
  const name = `tunnel-${toKebabCase(identity)}`;
  return new cloudflare.ZeroTrustTunnelCloudflared(
    name,
    {
      ...args,
      accountId,
    },
    options,
  );
}
