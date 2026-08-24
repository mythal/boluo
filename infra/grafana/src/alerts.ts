import {
  QueryBuilder as AlertQueryBuilder,
  RuleBuilder,
  RuleGroupBuilder,
  type Rule,
} from '@grafana/grafana-foundation-sdk/alerting';
import { TypeReduceBuilder, TypeThresholdBuilder } from '@grafana/grafana-foundation-sdk/expr';
import {
  DataqueryBuilder as PrometheusQueryBuilder,
  QueryEditorMode,
} from '@grafana/grafana-foundation-sdk/prometheus';
import {
  DAILY_BACKUP_MAX_AGE_SECONDS,
  DATABASE_APP,
  FULL_BACKUP_MAX_AGE_SECONDS,
  SERVER_APP,
  backupMetric,
  databaseVolumeUtilization,
  memoryUtilization,
} from './metrics.js';

const ALERT_FOLDER_NAME = 'Boluo';
const ALERT_FOLDER_UID = 'boluo';
const EXPRESSION_DATASOURCE_UID = '__expr__';
const ORGANIZATION_ID = 1;

type Comparator = 'gt' | 'lt';
type Severity = 'critical' | 'warning';
type ExportedRule = Omit<Rule, 'folderUID' | 'orgID' | 'ruleGroup'>;

interface AlertRuleOptions {
  uid: string;
  title: string;
  expression: string;
  comparator: Comparator;
  threshold: number;
  forDuration: string;
  severity: Severity;
  summary: string;
  description?: string;
}

interface AlertRuleGroup {
  name: string;
  intervalSeconds: number;
  rules: RuleBuilder[];
}

interface ProvisioningRuleGroup {
  orgId: number;
  name: string;
  folder: string;
  interval: string;
  rules: ExportedRule[];
}

export interface AlertRulesProvisioning {
  apiVersion: 1;
  deleteRules: { orgId: number; uid: string }[];
  groups: ProvisioningRuleGroup[];
}

function alertRule(
  datasourceUid: string,
  groupName: string,
  options: AlertRuleOptions,
): RuleBuilder {
  const query = new AlertQueryBuilder('A')
    .datasourceUid(datasourceUid)
    .relativeTimeRange({ from: 600, to: 0 })
    .model(
      new PrometheusQueryBuilder()
        .datasource({ type: 'prometheus', uid: datasourceUid })
        .editorMode(QueryEditorMode.Code)
        .expr(options.expression)
        .intervalMs(15_000)
        .maxDataPoints(43_200)
        .range()
        .refId('A'),
    );
  const reduction = new AlertQueryBuilder('B')
    .datasourceUid(EXPRESSION_DATASOURCE_UID)
    .relativeTimeRange({ from: 0, to: 0 })
    .model(
      new TypeReduceBuilder()
        .datasource({ type: '__expr__', uid: EXPRESSION_DATASOURCE_UID })
        .expression('A')
        .reducer('last')
        .settings({ mode: 'dropNN' })
        .refId('B'),
    );
  const threshold = new AlertQueryBuilder('C')
    .datasourceUid(EXPRESSION_DATASOURCE_UID)
    .relativeTimeRange({ from: 0, to: 0 })
    .model(
      new TypeThresholdBuilder()
        .datasource({ type: '__expr__', uid: EXPRESSION_DATASOURCE_UID })
        .expression('B')
        .conditions([
          {
            evaluator: {
              params: [options.threshold],
              type: options.comparator,
            },
          },
        ])
        .refId('C'),
    );

  const annotations: Record<string, string> = { summary: options.summary };
  if (options.description !== undefined) {
    annotations.description = options.description;
  }

  return new RuleBuilder(options.title)
    .uid(options.uid)
    .condition('C')
    .queries([query, reduction, threshold])
    .execErrState('KeepLast')
    .folderUID(ALERT_FOLDER_UID)
    .forDuration(options.forDuration)
    .labels({ service: 'boluo', severity: options.severity })
    .noDataState('KeepLast')
    .orgID(ORGANIZATION_ID)
    .ruleGroup(groupName)
    .annotations(annotations);
}

function unavailable(expression: string): string {
  return `(${expression}) or vector(0)`;
}

function cpuThrottle(app: string): string {
  return `max by(instance) (increase(fly_instance_cpu_throttle{app="${app}"}[5m])) / 100`;
}

function exportRule(rule: Rule): ExportedRule {
  const result: Partial<Rule> = { ...rule };
  Reflect.deleteProperty(result, 'folderUID');
  Reflect.deleteProperty(result, 'orgID');
  Reflect.deleteProperty(result, 'ruleGroup');
  return result as ExportedRule;
}

function provisioningGroup(group: AlertRuleGroup): ProvisioningRuleGroup {
  const built = new RuleGroupBuilder(group.name)
    .folderUid(ALERT_FOLDER_UID)
    .interval(group.intervalSeconds)
    .rules(group.rules)
    .build();

  return {
    orgId: ORGANIZATION_ID,
    name: built.title ?? group.name,
    folder: ALERT_FOLDER_NAME,
    interval: `${built.interval ?? group.intervalSeconds}s`,
    rules: (built.rules ?? []).map(exportRule),
  };
}

export function buildAlertRules(datasourceUid: string): AlertRulesProvisioning {
  const availability = 'Availability';
  const backups = 'Backups';
  const resources = 'Resources';
  const errors = 'Errors';

  const groups: AlertRuleGroup[] = [
    {
      name: availability,
      intervalSeconds: 60,
      rules: [
        alertRule(datasourceUid, availability, {
          uid: 'boluo-server-unavailable',
          title: 'Boluo server unavailable',
          expression: unavailable(`min(fly_instance_up{app="${SERVER_APP}"})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '3m',
          severity: 'critical',
          summary: 'The Boluo server is unavailable.',
        }),
        alertRule(datasourceUid, availability, {
          uid: 'boluo-database-unavailable',
          title: 'Database VM unavailable',
          expression: unavailable(`min(fly_instance_up{app="${DATABASE_APP}"})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '3m',
          severity: 'critical',
          summary: 'The database VM is unavailable.',
        }),
        alertRule(datasourceUid, availability, {
          uid: 'boluo-database-probe-failed',
          title: 'Database dependency unavailable',
          expression: unavailable(`min(boluo_server_database_up{app="${SERVER_APP}"})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '3m',
          severity: 'critical',
          summary: 'The server cannot reach PostgreSQL.',
        }),
        alertRule(datasourceUid, availability, {
          uid: 'boluo-redis-probe-failed',
          title: 'Redis dependency unavailable',
          expression: unavailable(`min(boluo_server_redis_up{app="${SERVER_APP}"})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '3m',
          severity: 'critical',
          summary: 'The server cannot reach Redis.',
        }),
        alertRule(datasourceUid, availability, {
          uid: 'boluo-database-metrics-down',
          title: 'Database metrics collection unavailable',
          expression: unavailable(`min(boluo_metrics_aggregator_up{app="${DATABASE_APP}"})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '5m',
          severity: 'warning',
          summary: 'Database or backup metrics collection is unavailable.',
        }),
      ],
    },
    {
      name: backups,
      intervalSeconds: 300,
      rules: [
        alertRule(datasourceUid, backups, {
          uid: 'boluo-backup-unhealthy',
          title: 'Backup repository unhealthy',
          expression: unavailable(
            `1 - clamp_max(max(${backupMetric('pgbackrest_stanza_status')} or ${backupMetric('pgbackrest_repo_status')} or ${backupMetric('pgbackrest_backup_last_error_status')}), 1)`,
          ),
          comparator: 'lt',
          threshold: 1,
          forDuration: '5m',
          severity: 'critical',
          summary: 'The pgBackRest repository or latest backup is unhealthy.',
        }),
        alertRule(datasourceUid, backups, {
          uid: 'boluo-wal-archive-unhealthy',
          title: 'WAL archive unhealthy',
          expression: unavailable(`min(${backupMetric('pgbackrest_wal_archive_status')})`),
          comparator: 'lt',
          threshold: 1,
          forDuration: '5m',
          severity: 'critical',
          summary: 'WAL archiving is unhealthy.',
        }),
        alertRule(datasourceUid, backups, {
          uid: 'boluo-daily-backup-stale',
          title: 'Daily backup stale',
          expression: `max(${backupMetric('pgbackrest_backup_since_last_completion_seconds', 'backup_type="diff"')}) or vector(${DAILY_BACKUP_MAX_AGE_SECONDS + 1})`,
          comparator: 'gt',
          threshold: DAILY_BACKUP_MAX_AGE_SECONDS,
          forDuration: '5m',
          severity: 'critical',
          summary: 'No differential backup has completed within 36 hours.',
        }),
        alertRule(datasourceUid, backups, {
          uid: 'boluo-full-backup-stale',
          title: 'Full backup stale',
          expression: `max(${backupMetric('pgbackrest_backup_since_last_completion_seconds', 'backup_type="full"')}) or vector(${FULL_BACKUP_MAX_AGE_SECONDS + 1})`,
          comparator: 'gt',
          threshold: FULL_BACKUP_MAX_AGE_SECONDS,
          forDuration: '5m',
          severity: 'critical',
          summary: 'No full backup has completed within eight days.',
        }),
      ],
    },
    {
      name: resources,
      intervalSeconds: 60,
      rules: [
        alertRule(datasourceUid, resources, {
          uid: 'aerq2mm1drdvkf',
          title: 'Server CPU throttling',
          expression: cpuThrottle(SERVER_APP),
          comparator: 'gt',
          threshold: 5,
          forDuration: '5m',
          severity: 'warning',
          summary: 'The server has been CPU-throttled for over five seconds in five minutes.',
          description: 'Uses throttling instead of burst balance so deployments do not trigger it.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-database-cpu-throttle',
          title: 'Database CPU throttling',
          expression: cpuThrottle(DATABASE_APP),
          comparator: 'gt',
          threshold: 5,
          forDuration: '5m',
          severity: 'warning',
          summary: 'The database has been CPU-throttled for over five seconds in five minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'ferq356m8vim8a',
          title: 'Server memory utilization high',
          expression: `max by(instance) (${memoryUtilization(SERVER_APP)})`,
          comparator: 'gt',
          threshold: 0.9,
          forDuration: '15m',
          severity: 'warning',
          summary: 'Server memory utilization has exceeded 90% for 15 minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-server-process-rss-high',
          title: 'Server process RSS high',
          expression: `max by(instance) (boluo_server_process_memory_bytes{app="${SERVER_APP}",kind="rss"}) / clamp_min(max by(instance) (fly_instance_memory_mem_total{app="${SERVER_APP}"}), 1)`,
          comparator: 'gt',
          threshold: 0.8,
          forDuration: '10m',
          severity: 'warning',
          summary: 'The server process RSS has exceeded 80% of instance memory for ten minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-server-anonymous-memory-growing',
          title: 'Server process RSS projected high',
          expression: `(clamp_min(predict_linear(max by(instance) (boluo_server_process_memory_bytes{app="${SERVER_APP}",kind="rss"})[1h:], 3600), 0) / clamp_min(max by(instance) (fly_instance_memory_mem_total{app="${SERVER_APP}"}), 1)) and on(instance) (max by(instance) (deriv(boluo_server_process_memory_bytes{app="${SERVER_APP}",kind="anonymous"}[1h])) > 0) and on(instance) (max by(instance) (fly_instance_uptime_seconds{app="${SERVER_APP}"}) > 3600)`,
          comparator: 'gt',
          threshold: 0.8,
          forDuration: '15m',
          severity: 'warning',
          summary:
            'Based on the latest hour, server process RSS is projected to exceed 80% of instance memory within one hour while anonymous memory is growing.',
          description:
            'Evaluation starts after one hour of instance uptime. Current RSS above 80% and overall instance memory above 90% are covered by separate alerts.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-server-process-swap-high',
          title: 'Server process swap usage high',
          expression: `max by(instance) (boluo_server_process_swap_bytes{app="${SERVER_APP}"})`,
          comparator: 'gt',
          threshold: 16 * 1024 * 1024,
          forDuration: '5m',
          severity: 'warning',
          summary: 'The server process has used more than 16 MiB of swap for five minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-database-memory-high',
          title: 'Database memory utilization high',
          expression: `max by(instance) (${memoryUtilization(DATABASE_APP)})`,
          comparator: 'gt',
          threshold: 0.9,
          forDuration: '15m',
          severity: 'warning',
          summary: 'Database memory utilization has exceeded 90% for 15 minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'bex8gxx9fy4u8b',
          title: 'Application database pool exhausted',
          expression: `max(boluo_server_db_pool_saturated{app="${SERVER_APP}"})`,
          comparator: 'gt',
          threshold: 0.5,
          forDuration: '2m',
          severity: 'critical',
          summary: 'The application database pool has been fully saturated for two minutes.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'boluo-server-file-descriptors-high',
          title: 'Server file descriptor usage high',
          expression: `max by(instance) (boluo_server_file_descriptors_ratio{app="${SERVER_APP}"})`,
          comparator: 'gt',
          threshold: 0.8,
          forDuration: '5m',
          severity: 'warning',
          summary: 'The server is using more than 80% of its file descriptor soft limit.',
          description: 'This uses the process soft limit from /proc/self/limits.',
        }),
        alertRule(datasourceUid, resources, {
          uid: 'cesxl3kmvyznkd',
          title: 'Database volume utilization high',
          expression: `max by(instance) (${databaseVolumeUtilization()})`,
          comparator: 'gt',
          threshold: 0.85,
          forDuration: '15m',
          severity: 'warning',
          summary: 'Database volume utilization has exceeded 85% for 15 minutes.',
        }),
      ],
    },
    {
      name: errors,
      intervalSeconds: 60,
      rules: [
        alertRule(datasourceUid, errors, {
          uid: 'boluo-http-5xx-rate-high',
          title: 'HTTP 5xx rate high',
          expression: `(sum(rate(fly_edge_http_responses_count{app="${SERVER_APP}",status=~"5.."}[5m]))) or vector(0)`,
          comparator: 'gt',
          threshold: 0.1,
          forDuration: '5m',
          severity: 'warning',
          summary: 'HTTP 5xx responses have exceeded 0.1 requests per second for five minutes.',
        }),
        alertRule(datasourceUid, errors, {
          uid: 'boluo-event-broadcast-lagged',
          title: 'Event broadcast lagging',
          expression: `(sum(rate(boluo_server_events_broadcast_lagged_total{app="${SERVER_APP}"}[5m]))) or vector(0)`,
          comparator: 'gt',
          threshold: 0,
          forDuration: '5m',
          severity: 'warning',
          summary: 'At least one event client has been unable to keep up with broadcasts.',
        }),
        alertRule(datasourceUid, errors, {
          uid: 'boluo-post-commit-effect-failed',
          title: 'Post-commit effect failures',
          expression: `(sum(rate(boluo_server_post_commit_effect_failed_total{app="${SERVER_APP}"}[5m]))) or vector(0)`,
          comparator: 'gt',
          threshold: 0,
          forDuration: '5m',
          severity: 'warning',
          summary: 'Post-commit state propagation is failing.',
        }),
        alertRule(datasourceUid, errors, {
          uid: 'boluo-space-activity-flush-failed',
          title: 'Space activity flush failures',
          expression: `(sum(rate(boluo_server_space_activity_flush_total{app="${SERVER_APP}",result="error"}[5m]))) or vector(0)`,
          comparator: 'gt',
          threshold: 0,
          forDuration: '5m',
          severity: 'warning',
          summary: 'Space activity updates are failing to persist.',
        }),
      ],
    },
  ];

  return {
    apiVersion: 1,
    deleteRules: [{ orgId: ORGANIZATION_ID, uid: 'cerrvei24hxj4f' }],
    groups: groups.map(provisioningGroup),
  };
}
