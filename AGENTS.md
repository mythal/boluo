# Repository Guidelines

## Project Structure & Modules

- Monorepo managed by Turborepo.
- Apps: `apps/site` (Next.js), `apps/spa` (Next.js), `apps/legacy` (Vite), `apps/server` (Rust).
- Packages: shared libraries in `packages/*` (e.g., `api`, `ui`, `utils`, `icons`, `theme`, `eslint-config`, `typescript-config`, `store`, `types`, `lang`).
- Docs and API requests: `docs/`.
- Env/config: `.env`, `.env.local`, `docker-compose.yml`, `flake.nix`.

## Tools

You can use:

- `ast-grep` to search and manipulate abstract syntax trees.
- `jq` to process JSON data.
- `sqlx-cli` to manage SQL migrations.

## Style

- Write comments in English.

## Build, Test, Develop

- Install deps: `npm install` (root). Nix users: `nix develop`.
- Generate types & SQLx: `./scripts/generate-types.sh`.
- Start development services (DB/Redis/MinIO): `docker-compose up` (root). Example creds in `.env.local.example`.
- Server (Rust): `cargo run -p server` (requires `DATABASE_URL`), build with `cargo build -p server`, tests `cargo test`.
- Frontends via turbo:
  - Dev: `npm run dev`, or `npm run dev:site` / `npm run dev:spa`.
  - Build: `npm run build`, or `build:site` / `build:spa` / `build:legacy`.
  - Lint/format/types: `npm run lint`, `npm run format`, `npm run check-types`.
  - Tests: `npm run test` for frontend and `cargo nextest run` for backend.

## Testing Guidelines

- The function name of database-related tests should start with `db_test_`.

## Quick Check

- Server: `cargo check`

## Commit & PR Guidelines

- Use Conventional Commits with scope when relevant (e.g., `feat(server): ...`, `chore(site): ...`).
- Ensure CI-passing locally: `npm run lint`, `npm test`, `cargo nextest`, and build commands as relevant.

## Security & Configuration

- Frontend needs `BACKEND_URL`; server needs `DATABASE_URL`. Local services provided by `docker-compose`.
