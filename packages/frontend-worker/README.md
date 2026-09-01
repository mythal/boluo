# Frontend Worker Runtime

Shared Cloudflare Worker implementation used by the legacy and SPA frontends.

Each frontend owns its Worker entry and supplies its application-specific
behavior to the shared `createFrontendWorker` factory.
