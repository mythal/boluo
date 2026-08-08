# Cloudflare infrastructure

This Pulumi project manages the long-lived Cloudflare infrastructure for Boluo.
Worker source code, builds, versions, and deployments remain owned by Wrangler.

## Stack

The `main` stack uses Pulumi's PostgreSQL DIY backend hosted on Neon. Backend
credentials and the stack passphrase must be supplied outside the repository.

```sh
export CLOUDFLARE_API_TOKEN=...
export PULUMI_BACKEND_URL='postgres://...'
export PULUMI_CONFIG_PASSPHRASE=...

pulumi stack select main
pulumi preview --refresh
```
