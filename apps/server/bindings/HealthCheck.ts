// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { CheckResult } from './CheckResult';
import type { ConnectionState } from './ConnectionState';
import type { DiskInfo } from './DiskInfo';

export type HealthCheck = {
  timestamp_sec: bigint;
  disks: Array<DiskInfo>;
  memory_total: bigint;
  memory_used: bigint;
  cache: CheckResult<ConnectionState>;
  database: CheckResult<ConnectionState>;
};
