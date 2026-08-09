# Avatar Worker

This Cloudflare Worker serves deterministic SVG fallback avatars at
`https://avatars.boluochat.com/<name>`. It was migrated from the standalone
[`mythal/avatars`](https://github.com/mythal/avatars) repository.

Use the optional `size` query parameter to set the SVG width and height. Invalid
or omitted values use `256`.

```sh
npm run dev --workspace=@boluo/avatars
npm run test --workspace=@boluo/avatars
```

The `boluo-avatars` Worker service is deployed by the production release job.
Its `avatars.boluochat.com` custom domain remains managed by Pulumi under
`infra/cloudflare`.
