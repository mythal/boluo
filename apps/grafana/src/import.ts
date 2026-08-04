import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

const outputDirectory = resolve(import.meta.dirname, '../dist');
const folderTitle = 'Boluo';
const defaultFolderUid = 'boluo';
const defaultGrafanaUrl = 'https://stats.mythal.net/';
const grafanaNamespace = 'default';

type JsonObject = Record<string, unknown>;
type Change = 'create' | 'delete' | 'unchanged' | 'update';

interface ResourceMetadata {
  annotations?: Record<string, string>;
  name: string;
}

interface DashboardResource extends JsonObject {
  apiVersion: string;
  kind: 'Dashboard';
  metadata: ResourceMetadata;
  spec: JsonObject;
}

interface AlertRule extends JsonObject {
  title: string;
  uid: string;
}

interface AlertRuleGroup {
  interval: string;
  name: string;
  orgId: number;
  rules: AlertRule[];
}

interface AlertRulesProvisioning {
  apiVersion: 1;
  deleteRules: { orgId: number; uid: string }[];
  groups: AlertRuleGroup[];
}

interface FolderResource {
  metadata: ResourceMetadata;
  spec: { title: string };
}

interface FolderList {
  items: FolderResource[];
  metadata?: { continue?: string };
}

interface DashboardPlan {
  change: Change;
  desired: DashboardResource;
  path: string;
  remote?: DashboardResource;
}

interface AlertGroupPlan {
  change: Change;
  desired: ApiAlertRuleGroup;
  path: string;
  ruleChanges: { change: Change; title: string }[];
}

interface AlertDeletePlan {
  change: 'delete' | 'unchanged';
  title: string;
  uid: string;
}

interface ApiAlertRuleGroup {
  folderUid: string;
  interval: number;
  rules: ApiAlertRule[];
  title: string;
}

interface ApiAlertRule extends AlertRule {
  folderUID: string;
  orgID: number;
  ruleGroup: string;
}

interface Options {
  yes: boolean;
  url: URL;
}

class GrafanaClient {
  constructor(
    private readonly baseUrl: URL,
    private readonly token: string,
  ) {}

  async request<T>(
    path: string,
    init: RequestInit = {},
    allowedStatuses: number[] = [],
  ): Promise<T | undefined> {
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    });

    if (allowedStatuses.includes(response.status)) {
      return undefined;
    }
    if (!response.ok) {
      const detail = (await response.text()).trim();
      throw new Error(
        `${init.method ?? 'GET'} ${path} failed (${response.status})${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    if (response.status === 204) {
      return undefined;
    }
    return (await response.json()) as T;
  }
}

function usage(): never {
  console.log(`Usage: npm run import --workspace=@boluo/grafana -- [--url <grafana-url>] [--yes]

GRAFANA_TOKEN must contain a Grafana service account token.
The URL defaults to ${defaultGrafanaUrl}.`);
  process.exit(0);
}

function parseOptions(argv: string[]): Options {
  let url = defaultGrafanaUrl;
  let yes = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      usage();
    }
    const value = argv[index + 1];
    if (argument === '--url' && value !== undefined) {
      url = value;
      index += 1;
    } else if (argument === '--yes') {
      yes = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument ?? ''}`);
    }
  }

  const parsedUrl = new URL(url.endsWith('/') ? url : `${url}/`);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('--url must use HTTP or HTTPS.');
  }
  return { url: parsedUrl, yes };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDashboard(value: unknown): value is DashboardResource {
  return (
    isObject(value) &&
    value.kind === 'Dashboard' &&
    typeof value.apiVersion === 'string' &&
    isObject(value.metadata) &&
    typeof value.metadata.name === 'string' &&
    isObject(value.spec)
  );
}

function isAlertRules(value: unknown): value is AlertRulesProvisioning {
  return isObject(value) && value.apiVersion === 1 && Array.isArray(value.groups);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (!isObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]),
  );
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function selectShape(value: unknown, shape: unknown): unknown {
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((item, index) => selectShape(item, shape[index]));
  }
  if (!isObject(shape) || !isObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(shape).map(([key, childShape]) => [key, selectShape(value[key], childShape)]),
  );
}

function apiPath(apiVersion: string, namespace: string, resource: string, name?: string): string {
  const suffix = name === undefined ? '' : `/${encodeURIComponent(name)}`;
  return `/apis/${apiVersion}/namespaces/${encodeURIComponent(namespace)}/${resource}${suffix}`;
}

async function readResources(): Promise<{
  alerts: AlertRulesProvisioning;
  dashboards: DashboardResource[];
}> {
  const dashboards: DashboardResource[] = [];
  let alerts: AlertRulesProvisioning | undefined;
  const files = (await readdir(outputDirectory)).filter((file) => file.endsWith('.json')).sort();

  for (const file of files) {
    const value: unknown = JSON.parse(await readFile(resolve(outputDirectory, file), 'utf8'));
    if (isDashboard(value)) {
      dashboards.push(value);
    } else if (isAlertRules(value)) {
      if (alerts !== undefined) {
        throw new Error('More than one alert provisioning file was found.');
      }
      alerts = value;
    } else {
      throw new Error(`Unsupported Grafana resource: ${file}`);
    }
  }

  if (alerts === undefined) {
    throw new Error('No alert provisioning file was found.');
  }
  return { alerts, dashboards };
}

async function findFolder(
  client: GrafanaClient,
  namespace: string,
): Promise<FolderResource | undefined> {
  let continuation: string | undefined;
  do {
    const query = new URLSearchParams({ limit: '1000' });
    if (continuation !== undefined) {
      query.set('continue', continuation);
    }
    const list = await client.request<FolderList>(
      `${apiPath('folder.grafana.app/v1', namespace, 'folders')}?${query}`,
    );
    const folder = list?.items.find((item) => item.spec.title === folderTitle);
    if (folder !== undefined) {
      return folder;
    }
    continuation = list?.metadata?.continue;
  } while (continuation !== undefined && continuation !== '');
  return undefined;
}

function dashboardPath(resource: DashboardResource, namespace: string): string {
  return apiPath(resource.apiVersion, namespace, 'dashboards', resource.metadata.name);
}

async function planDashboards(
  client: GrafanaClient,
  dashboards: DashboardResource[],
  namespace: string,
  folderUid: string,
): Promise<DashboardPlan[]> {
  return Promise.all(
    dashboards.map(async (resource) => {
      const desired: DashboardResource = {
        ...resource,
        metadata: {
          name: resource.metadata.name,
          annotations: { 'grafana.app/folder': folderUid },
        },
      };
      const path = dashboardPath(desired, namespace);
      const remote = await client.request<DashboardResource>(path, {}, [404]);
      const change =
        remote === undefined
          ? 'create'
          : equal(remote.spec, desired.spec) &&
              remote.metadata.annotations?.['grafana.app/folder'] === folderUid
            ? 'unchanged'
            : 'update';
      return { change, desired, path, remote };
    }),
  );
}

function toApiAlertGroup(group: AlertRuleGroup, folderUid: string): ApiAlertRuleGroup {
  const interval = Number.parseInt(group.interval, 10);
  if (!Number.isSafeInteger(interval) || interval <= 0 || `${interval}s` !== group.interval) {
    throw new Error(`Unsupported alert interval: ${group.interval}`);
  }
  return {
    folderUid,
    interval,
    rules: group.rules.map((rule) => ({
      ...rule,
      folderUID: folderUid,
      orgID: group.orgId,
      ruleGroup: group.name,
    })),
    title: group.name,
  };
}

async function planAlerts(
  client: GrafanaClient,
  provisioning: AlertRulesProvisioning,
  folderUid: string,
): Promise<{ deletes: AlertDeletePlan[]; groups: AlertGroupPlan[] }> {
  const remoteRules =
    (await client.request<ApiAlertRule[]>('/api/v1/provisioning/alert-rules')) ?? [];
  const remoteByUid = new Map(remoteRules.map((rule) => [rule.uid, rule]));

  const groups = await Promise.all(
    provisioning.groups.map(async (group): Promise<AlertGroupPlan> => {
      const desired = toApiAlertGroup(group, folderUid);
      const path = `/api/v1/provisioning/folder/${encodeURIComponent(folderUid)}/rule-groups/${encodeURIComponent(group.name)}`;
      const remoteGroup = await client.request<ApiAlertRuleGroup>(path, {}, [404]);
      const ruleChanges: AlertGroupPlan['ruleChanges'] = desired.rules.map((rule) => {
        const remote = remoteByUid.get(rule.uid);
        return {
          change:
            remote === undefined
              ? 'create'
              : equal(selectShape(remote, rule), rule)
                ? 'unchanged'
                : 'update',
          title: rule.title,
        };
      });
      const groupChanged =
        remoteGroup === undefined ||
        remoteGroup.interval !== desired.interval ||
        ruleChanges.some(({ change }) => change !== 'unchanged') ||
        remoteGroup.rules.length !== desired.rules.length;
      return {
        change: groupChanged ? (remoteGroup === undefined ? 'create' : 'update') : 'unchanged',
        desired,
        path,
        ruleChanges,
      };
    }),
  );

  const deletes: AlertDeletePlan[] = provisioning.deleteRules.map(({ uid }) => {
    const remote = remoteByUid.get(uid);
    return {
      change: remote === undefined ? 'unchanged' : 'delete',
      title: remote?.title ?? uid,
      uid,
    };
  });
  return { deletes, groups };
}

function dashboardPanels(resource: DashboardResource): Map<string, unknown> {
  const elements = resource.spec.elements;
  if (!isObject(elements)) {
    return new Map();
  }
  return new Map(Object.entries(elements));
}

function panelTitle(panel: unknown, fallback: string): string {
  if (isObject(panel) && isObject(panel.spec) && typeof panel.spec.title === 'string') {
    return panel.spec.title;
  }
  return fallback;
}

function dashboardDetails(plan: DashboardPlan): string {
  const desired = dashboardPanels(plan.desired);
  if (plan.change === 'create') {
    return `${desired.size} panels`;
  }
  if (plan.remote === undefined) {
    return '';
  }
  const remote = dashboardPanels(plan.remote);
  const changes: string[] = [];
  for (const [name, panel] of desired) {
    const oldPanel = remote.get(name);
    if (oldPanel === undefined) {
      changes.push(`+${panelTitle(panel, name)}`);
    } else if (!equal(panel, oldPanel)) {
      changes.push(`~${panelTitle(panel, name)}`);
    }
  }
  for (const [name, panel] of remote) {
    if (!desired.has(name)) {
      changes.push(`-${panelTitle(panel, name)}`);
    }
  }
  if (changes.length === 0 && plan.change === 'update') {
    changes.push('settings/layout/folder');
  }
  return changes.join(', ');
}

function printPlan(
  folder: FolderResource | undefined,
  dashboards: DashboardPlan[],
  alerts: { deletes: AlertDeletePlan[]; groups: AlertGroupPlan[] },
): number {
  let changes = 0;
  console.log('\nImport plan\n');
  if (folder === undefined) {
    console.log(`CREATE folder: ${folderTitle}`);
    changes += 1;
  } else {
    console.log(`KEEP   folder: ${folderTitle} (${folder.metadata.name})`);
  }

  for (const dashboard of dashboards) {
    const title =
      typeof dashboard.desired.spec.title === 'string'
        ? dashboard.desired.spec.title
        : dashboard.desired.metadata.name;
    const details = dashboardDetails(dashboard);
    console.log(
      `${dashboard.change.toUpperCase().padEnd(6)} dashboard: ${title}${details === '' ? '' : ` (${details})`}`,
    );
    if (dashboard.change !== 'unchanged') {
      changes += 1;
    }
  }

  for (const group of alerts.groups) {
    console.log(
      `${group.change.toUpperCase().padEnd(6)} alert group: ${group.desired.title} (${group.desired.interval}s)`,
    );
    for (const rule of group.ruleChanges.filter(({ change }) => change !== 'unchanged')) {
      console.log(`       ${rule.change.toUpperCase().padEnd(6)} ${rule.title}`);
    }
    if (group.change !== 'unchanged') {
      changes += 1;
    }
  }
  for (const deletion of alerts.deletes.filter(({ change }) => change === 'delete')) {
    console.log(`DELETE alert rule: ${deletion.title}`);
    changes += 1;
  }
  return changes;
}

async function confirm(): Promise<boolean> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await terminal.question('\nType "import" to apply these changes: ');
  terminal.close();
  return answer.trim() === 'import';
}

async function applyPlan(
  client: GrafanaClient,
  namespace: string,
  folder: FolderResource | undefined,
  dashboards: DashboardPlan[],
  alerts: { deletes: AlertDeletePlan[]; groups: AlertGroupPlan[] },
): Promise<void> {
  if (folder === undefined) {
    await client.request(apiPath('folder.grafana.app/v1', namespace, 'folders'), {
      method: 'POST',
      body: JSON.stringify({
        apiVersion: 'folder.grafana.app/v1',
        kind: 'Folder',
        metadata: { name: defaultFolderUid },
        spec: { title: folderTitle },
      }),
    });
    console.log(`Created folder: ${folderTitle}`);
  }

  for (const dashboard of dashboards.filter(({ change }) => change !== 'unchanged')) {
    const collectionPath = apiPath(dashboard.desired.apiVersion, namespace, 'dashboards');
    await client.request(dashboard.change === 'create' ? collectionPath : dashboard.path, {
      method: dashboard.change === 'create' ? 'POST' : 'PUT',
      body: JSON.stringify(dashboard.desired),
    });
    console.log(
      `${dashboard.change === 'create' ? 'Created' : 'Updated'} dashboard: ${String(dashboard.desired.spec.title)}`,
    );
  }

  for (const group of alerts.groups.filter(({ change }) => change !== 'unchanged')) {
    await client.request(group.path, {
      method: 'PUT',
      headers: { 'X-Disable-Provenance': 'true' },
      body: JSON.stringify(group.desired),
    });
    console.log(
      `${group.change === 'create' ? 'Created' : 'Updated'} alert group: ${group.desired.title}`,
    );
  }

  for (const deletion of alerts.deletes.filter(({ change }) => change === 'delete')) {
    await client.request(`/api/v1/provisioning/alert-rules/${encodeURIComponent(deletion.uid)}`, {
      method: 'DELETE',
      headers: { 'X-Disable-Provenance': 'true' },
    });
    console.log(`Deleted alert rule: ${deletion.title}`);
  }
}

try {
  const options = parseOptions(process.argv.slice(2));
  // This command runs directly through npm, outside Turbo's task cache.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const token = process.env.GRAFANA_TOKEN;
  if (token === undefined || token === '') {
    throw new Error('GRAFANA_TOKEN is required.');
  }

  const client = new GrafanaClient(options.url, token);
  const resources = await readResources();
  const folder = await findFolder(client, grafanaNamespace);
  const folderUid = folder?.metadata.name ?? defaultFolderUid;
  const [dashboards, alerts] = await Promise.all([
    planDashboards(client, resources.dashboards, grafanaNamespace, folderUid),
    planAlerts(client, resources.alerts, folderUid),
  ]);
  const changes = printPlan(folder, dashboards, alerts);
  if (changes === 0) {
    console.log('\nEverything is up to date.');
  } else if (options.yes || (await confirm())) {
    await applyPlan(client, grafanaNamespace, folder, dashboards, alerts);
    console.log('\nImport complete.');
  } else {
    console.log('\nImport cancelled.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
