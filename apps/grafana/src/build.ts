import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { manifest } from '@grafana/grafana-foundation-sdk/dashboardv2';
import { format } from 'prettier';
import {
  BOLUO_DASHBOARD_RESOURCE_NAME,
  DEFAULT_PROMETHEUS_DATASOURCE_UID,
  buildBoluoDashboard,
} from './boluo.js';
import { DATABASE_DASHBOARD_RESOURCE_NAME, buildDatabaseDashboard } from './database.js';
import { HEALTH_DASHBOARD_RESOURCE_NAME, buildHealthDashboard } from './health.js';

const outputDirectory = resolve(import.meta.dirname, '../dist');
const datasourceUid = DEFAULT_PROMETHEUS_DATASOURCE_UID;

const dashboards = [
  {
    outputPath: resolve(outputDirectory, 'boluo.json'),
    resource: manifest(BOLUO_DASHBOARD_RESOURCE_NAME, buildBoluoDashboard(datasourceUid)).build(),
  },
  {
    outputPath: resolve(outputDirectory, 'database.json'),
    resource: manifest(
      DATABASE_DASHBOARD_RESOURCE_NAME,
      buildDatabaseDashboard(datasourceUid),
    ).build(),
  },
  {
    outputPath: resolve(outputDirectory, 'health.json'),
    resource: manifest(HEALTH_DASHBOARD_RESOURCE_NAME, buildHealthDashboard(datasourceUid)).build(),
  },
];

await mkdir(outputDirectory, { recursive: true });
for (const dashboard of dashboards) {
  const output = await format(JSON.stringify(dashboard.resource), {
    parser: 'json',
    printWidth: 100,
  });
  await writeFile(dashboard.outputPath, output, 'utf8');
  console.log(`Built ${dashboard.outputPath}`);
}
