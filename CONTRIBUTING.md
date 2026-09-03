This project is an open‑source chat tool designed for playing traditional tabletop RPGs (e.g., D&D, CoC). It is structured as a Rust + TypeScript monorepo managed with Turborepo. The repository consists of a Rust backend and multiple Next.js frontend applications.

Important design decisions are documented in `docs/DESIGN.md`, which is intentionally kept concise and only records non-obvious decisions.

## General Notes

- The language of the codebase is English.
- Before making changes, ensure you understand the relevant parts of the codebase.
- Use [Scoped Commits](https://scopedcommits.com/) as the commit convention. For example: `spa, legacy: add some new feature`.
- Temporary files created during development can be placed in the `.tmp/` directory, which is ignored.

## Observability

The observability stack includes:

- VictoriaMetrics `https://metrics.mythal.net/api/v1/query`
- VictoriaLog `https://log.mythal.net/`

These services are internal and accessible only to trusted contributors.

---

## Backend (`crates/server`)

The backend is written in Rust using **hyper** and **tokio**. PostgreSQL 18 is accessed through **sqlx**.

The standalone database schema is located in `apps/db/schema.sql`. Migrations are in `crates/server/migrations`.

Although sharding by space is planned, only single-node deployment is currently available.

### Development Notes

- When modifying SQL statements or RESTful APIs, run: `cargo run -p server -- types` to regenerate types.
- Run tests with cargo-nextest.
- Database-related tests:
  - Use `sqlx::test`
  - Test function names must start with `db_test_`

---

## Frontend

The frontend consists of three applications.

### Checking and Linting

- Type checking: `npm run check`
- Linting: `npm run lint`

> **Note**: `noUncheckedIndexedAccess` is enabled in TypeScript configuration.

Turborepo's options are available for both commands, e.g., `npm run check -- --filter=site --filter='@boluo/ui'`.

### Main Chat App (`apps/spa`)

- Built with **Next.js**, exported as a **static** site.
- Styling via **Tailwind CSS v4** (config in `packages/tailwind-config/tailwind.css`).
- State management: **jotai**.
- Default UI language is English, with internationalization via **react-intl**.
- Basic components are located in `packages/ui`. Prioritize using existing base components.

### Main Site (`apps/site`)

- A dynamic Next.js application providing non-chat features (chat record, introduction pages, account-related pages).
- Uses the same Tailwind + Jotai setup as `apps/spa`.

### Legacy Chat App (`apps/legacy`)

- Vite + React SPA.
- Styling via **Tailwind CSS v4**.
- State management is a mix of jotai and redux.

### Shared UI (`packages/ui`)

- Contains common stateless UI components.
- Each component should have an associated story in `apps/storybook`.
