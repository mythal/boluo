export const SERVER_APP = 'boluo-server';
export const DATABASE_APP = 'boluo-db';
export const DATABASE_NAME = 'boluo';
export const BACKUP_STANZA = 'boluo';
export const DAILY_BACKUP_MAX_AGE_SECONDS = 36 * 60 * 60;
export const FULL_BACKUP_MAX_AGE_SECONDS = 8 * 24 * 60 * 60;

export function backupMetric(metric: string, extraLabels = ''): string {
  const labels = extraLabels ? `,${extraLabels}` : '';
  return `${metric}{app="${DATABASE_APP}",stanza="${BACKUP_STANZA}"${labels}}`;
}

export function cpuBudget(app: string): string {
  return `min_over_time(fly_instance_cpu_balance{app="${app}"}[60s]) / count without(cpu_id, mode) (fly_instance_cpu{app="${app}",mode="idle"}) / 100`;
}

export function memoryUtilization(app: string): string {
  return `(fly_instance_memory_mem_total{app="${app}"} - fly_instance_memory_mem_available{app="${app}"}) / fly_instance_memory_mem_total{app="${app}"}`;
}

export function databaseVolumeUtilization(): string {
  return `1 - fly_instance_filesystem_blocks_avail{app="${DATABASE_APP}",mount="/var/lib/postgresql"} / fly_instance_filesystem_blocks{app="${DATABASE_APP}",mount="/var/lib/postgresql"}`;
}
