# Grafana resources

Grafana dashboards and alert rules are built with the Grafana Foundation SDK.

Build the resources from the repository root:

```sh
npm run build -- --filter=@boluo/grafana
```

Build artifacts are written to `dist/`.

To preview and import them into Grafana:

```sh
GRAFANA_TOKEN=<service-account-token> npm run import --workspace=@boluo/grafana
```
