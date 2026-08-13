import {
  DashboardBuilder,
  DashboardCursorSync,
  GridBuilder,
  PanelBuilder,
  QueryGroupBuilder,
  gridItem,
} from '@grafana/grafana-foundation-sdk/dashboardv2';
import {
  CodeLanguage,
  CodeOptionsBuilder,
  TextMode,
  VisualizationV2Builder as TextVisualizationBuilder,
} from '@grafana/grafana-foundation-sdk/text';
import {
  GRAFANA_PLUGIN_VERSION,
  QueryEditorMode,
  TooltipDisplayMode,
  dashboardTimeSettings,
  defaultAnnotations,
  healthStatPanel,
  timeSeriesPanel,
} from './lib.js';
import {
  DAILY_BACKUP_MAX_AGE_SECONDS,
  DATABASE_APP,
  FULL_BACKUP_MAX_AGE_SECONDS,
  SERVER_APP,
  backupMetric,
  cpuBudget,
  databaseVolumeUtilization,
} from './metrics.js';

export const HEALTH_DASHBOARD_RESOURCE_NAME = '42772a90-01f2-4b96-b40d-ad99a7608308';

const RATE_INTERVAL = '$__rate_interval';

const panels = {
  mascot: 'panel-9',
  services: 'panel-1',
  exporters: 'panel-2',
  backups: 'panel-3',
  criticalErrors: 'panel-4',
  dependencyLatency: 'panel-5',
  databaseVolume: 'panel-6',
  cpuBudget: 'panel-7',
} as const;

function withMissingAsDown(expression: string): string {
  return `(${expression}) or vector(0)`;
}

function serverRate(metric: string, extraLabels = ''): string {
  const labels = extraLabels ? `,${extraLabels}` : '';
  return `rate(${metric}{app="${SERVER_APP}"${labels}}[${RATE_INTERVAL}])`;
}

function summaryQuantile(quantile: number, metric: string): string {
  return `${metric}{app="${SERVER_APP}",quantile="${quantile}"}`;
}

function mascotPanel(): PanelBuilder {
  const visualization = new TextVisualizationBuilder()
    .mode(TextMode.Markdown)
    .code(
      new CodeOptionsBuilder()
        .language(CodeLanguage.Plaintext)
        .showLineNumbers(false)
        .showMiniMap(false),
    )
    .content(
      '![](https://forum-media.mythal.net/original/1X/65c77c3e21faa422b7e999c2e62bb968dd5429cf.jpeg)',
    );

  return new PanelBuilder()
    .id(9)
    .title('乖乖')
    .data(new QueryGroupBuilder())
    .visualization({
      build: () => {
        const result = visualization.build();
        result.version = GRAFANA_PLUGIN_VERSION;
        return result;
      },
    });
}

export function buildHealthDashboard(datasourceUid: string): DashboardBuilder {
  return new DashboardBuilder('Boluo Health')
    .annotations([defaultAnnotations()])
    .cursorSync(DashboardCursorSync.Off)
    .editable(true)
    .element(panels.mascot, mascotPanel())
    .element(
      panels.services,
      healthStatPanel({
        id: 1,
        title: 'Service health',
        description: 'Missing metrics are DOWN.',
        datasourceUid,
        targets: [
          {
            refId: 'server-vm',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(fly_instance_up{app="${SERVER_APP}"})`),
            legendFormat: 'Server VM',
          },
          {
            refId: 'database-vm',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(fly_instance_up{app="${DATABASE_APP}"})`),
            legendFormat: 'Database VM',
          },
          {
            refId: 'database-probe',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(boluo_server_database_up{app="${SERVER_APP}"})`),
            legendFormat: 'Database probe',
          },
          {
            refId: 'redis-probe',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(boluo_server_redis_up{app="${SERVER_APP}"})`),
            legendFormat: 'Redis probe',
          },
          {
            refId: 'postgres',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(pg_up{app="${DATABASE_APP}"})`),
            legendFormat: 'PostgreSQL',
          },
        ],
      }),
    )
    .element(
      panels.exporters,
      healthStatPanel({
        id: 2,
        title: 'Metrics collection',
        datasourceUid,
        targets: [
          {
            refId: 'aggregator-postgres',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `min(boluo_metrics_aggregator_up{app="${DATABASE_APP}",upstream="postgres"})`,
            ),
            legendFormat: 'Postgres metrics',
          },
          {
            refId: 'aggregator-backup',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `min(boluo_metrics_aggregator_up{app="${DATABASE_APP}",upstream="pgbackrest"})`,
            ),
            legendFormat: 'Backup metrics',
          },
          {
            refId: 'postgres-scrape',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `1 - clamp_max(max(pg_exporter_last_scrape_error{app="${DATABASE_APP}"}), 1)`,
            ),
            legendFormat: 'Postgres scrape',
          },
          {
            refId: 'backup-exporter',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(${backupMetric('pgbackrest_exporter_status')})`),
            legendFormat: 'Backup exporter',
          },
        ],
      }),
    )
    .element(
      panels.backups,
      healthStatPanel({
        id: 3,
        title: 'Backup health',
        description: 'Freshness: daily 36h; full 8d.',
        datasourceUid,
        targets: [
          {
            refId: 'stanza',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `1 - clamp_max(max(${backupMetric('pgbackrest_stanza_status')}), 1)`,
            ),
            legendFormat: 'Stanza',
          },
          {
            refId: 'repository',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `1 - clamp_max(max(${backupMetric('pgbackrest_repo_status')}), 1)`,
            ),
            legendFormat: 'Repository',
          },
          {
            refId: 'latest-backup',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `1 - clamp_max(max(${backupMetric('pgbackrest_backup_last_error_status')}), 1)`,
            ),
            legendFormat: 'Latest backup',
          },
          {
            refId: 'daily-freshness',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `max(${backupMetric('pgbackrest_backup_since_last_completion_seconds', 'backup_type="diff"')}) < bool ${DAILY_BACKUP_MAX_AGE_SECONDS}`,
            ),
            legendFormat: 'Daily freshness',
          },
          {
            refId: 'full-freshness',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(
              `max(${backupMetric('pgbackrest_backup_since_last_completion_seconds', 'backup_type="full"')}) < bool ${FULL_BACKUP_MAX_AGE_SECONDS}`,
            ),
            legendFormat: 'Full freshness',
          },
          {
            refId: 'wal-archive',
            editorMode: QueryEditorMode.Code,
            expr: withMissingAsDown(`min(${backupMetric('pgbackrest_wal_archive_status')})`),
            legendFormat: 'WAL archive',
          },
        ],
      }),
    )
    .element(
      panels.criticalErrors,
      timeSeriesPanel({
        id: 4,
        title: 'Critical error rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'http-5xx',
            editorMode: QueryEditorMode.Code,
            expr: `(sum(rate(fly_app_http_responses_count{app="${SERVER_APP}",status=~"5.."}[${RATE_INTERVAL}]))) or vector(0)`,
            legendFormat: 'HTTP 5xx',
          },
          {
            refId: 'message-create',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_messages_created_failed_total')})`,
            legendFormat: 'message create',
          },
          {
            refId: 'tcp-error',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_tcp_connections_error_total')})`,
            legendFormat: 'TCP error',
          },
          {
            refId: 'runtime-load',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_space_runtime_load_failed_total')})`,
            legendFormat: 'runtime load',
          },
          {
            refId: 'runtime-refresh',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_space_runtime_refresh_failed_total')})`,
            legendFormat: 'runtime refresh',
          },
          {
            refId: 'post-commit',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_post_commit_effect_failed_total')})`,
            legendFormat: 'post-commit effect',
          },
          {
            refId: 'broadcast-lagged',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_events_broadcast_lagged_total')})`,
            legendFormat: 'event broadcast lag',
          },
          {
            refId: 'activity-flush',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${serverRate('boluo_server_space_activity_flush_total', 'result="error"')})`,
            legendFormat: 'activity flush',
          },
        ],
      }),
    )
    .element(
      panels.dependencyLatency,
      timeSeriesPanel({
        id: 5,
        title: 'Dependency probe latency',
        datasourceUid,
        unit: 'ms',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'database',
            editorMode: QueryEditorMode.Code,
            expr: `max by(instance) (boluo_server_database_probe_rtt_ms{app="${SERVER_APP}"})`,
            legendFormat: '{{instance}} database',
          },
          {
            refId: 'redis',
            editorMode: QueryEditorMode.Code,
            expr: `max by(instance) (boluo_server_redis_probe_rtt_ms{app="${SERVER_APP}"})`,
            legendFormat: '{{instance}} redis',
          },
          {
            refId: 'database-pool-acquire',
            editorMode: QueryEditorMode.Code,
            expr: `${summaryQuantile(0.95, 'boluo_server_db_pool_probe_acquire_duration_seconds')} * 1000`,
            legendFormat: '{{instance}} database pool acquire p95',
          },
        ],
      }),
    )
    .element(
      panels.databaseVolume,
      timeSeriesPanel({
        id: 6,
        title: 'Database volume utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'volume',
            editorMode: QueryEditorMode.Code,
            expr: databaseVolumeUtilization(),
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.cpuBudget,
      timeSeriesPanel({
        id: 7,
        title: 'CPU burst budget',
        description: 'Shared CPU instances only.',
        datasourceUid,
        unit: 's',
        min: 0,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'server',
            editorMode: QueryEditorMode.Code,
            expr: cpuBudget(SERVER_APP),
            legendFormat: '{{instance}} server',
          },
          {
            refId: 'database',
            editorMode: QueryEditorMode.Code,
            expr: cpuBudget(DATABASE_APP),
            legendFormat: '{{instance}} database',
          },
        ],
      }),
    )
    .layout(
      new GridBuilder().items([
        gridItem(panels.mascot).x(0).y(0).width(4).height(8),
        gridItem(panels.services).x(4).y(0).width(10).height(8),
        gridItem(panels.backups).x(14).y(0).width(10).height(8),
        gridItem(panels.exporters).x(0).y(8).width(8).height(8),
        gridItem(panels.criticalErrors).x(8).y(8).width(8).height(8),
        gridItem(panels.databaseVolume).x(16).y(8).width(8).height(8),
        gridItem(panels.dependencyLatency).x(0).y(16).width(12).height(8),
        gridItem(panels.cpuBudget).x(12).y(16).width(12).height(8),
      ]),
    )
    .links([])
    .preload(false)
    .tags(['boluo', 'health', 'production', 'managed-by-code'])
    .timeSettings(dashboardTimeSettings('now-6h'))
    .variables([]);
}
