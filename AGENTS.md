This project is an open‑source chat tool designed for playing traditional tabletop RPGs (e.g., D&D, CoC). It is structured as a Rust + TypeScript monorepo managed with Turborepo. The repository consists of a Rust backend and multiple Next.js frontend applications.

## General Notes

- You can use `ast-grep` to search and refactor code if needed.
- The language of the codebase is English. But you should response user by the language they used.
- Before making changes, ensure you understand the relevant parts of the codebase.
- After making changes, provide 2-3 concise possible commit messages as options to summarize your work using conventional commit format, package name as scope.
- Temprorary files in the development can be placed in the `.tmp/` directory, which is ignored.

---

## Backend (`apps/server`)

The backend is written in Rust using **hyper** and **tokio**. PostgreSQL is accessed through **sqlx**.

### Development Notes

- When modifying SQL statements or RESTful APIs, run: `./scripts/generate-types.sh` to regenerate types.
- You should run `cargo check` after modifying any Rust code.
- Run tests: `cargo nextest run`
- Database-related tests:
  - Use `sqlx::test`
  - Test function names must start with `db_test_`
- When using Cargo commands that don’t require network requests, prefer: `SQLX_OFFLINE=true cargo --offline <command>` to avoid triggering sandbox restrictions. otherwise, you should request the user for permission for network access.

---

## Frontend

The frontend consists of three applications.

### Checking and Linting

You should run `npm run check` after modifying TypeScript code.

- Type checking: `npm run check`
- Linting: `npm run lint`

> **Note**: `noUncheckedIndexedAccess` is enabled in TypeScript configuration. Please handle potential `undefined` results when accessing arrays or objects by index.

Turborepo's options are available for both commands, e.g., `npm run check -- --filter=site --filter='@boluo/ui'`.

### Main Chat App (`apps/spa`)

- Built with **Next.js**, exported as a **static** site.
- Styling: **tailwindcss v4** (config in `packages/tailwind-config/tailwind.css`).
- State management: **jotai**.
- Default UI language: English, with internationalization via **react-intl**.
- Basic components in `packages/ui`.

### Main Site (`apps/site`)

- A dynamic Next.js application providing non-chat features (chat record, introduction pages, account-related pages).
- Uses the same Tailwind + Jotai setup as `apps/spa`.

### Legacy Chat App (`apps/legacy`)

- A historical Vite + React SPA.
- Styling via **emotion**, written in a utility-first style similar to Tailwind.
- State management is a mix of jotai and redux.

### Shared UI (`packages/ui`)

- Contains common stateless UI components.
- Components here should have associated stories in `apps/storybook`.
