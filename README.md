# Boluo

A chat application designed specifically for playing RPGs.

![screenshot](https://media.boluochat.com/3e98ead0-fcda-11ee-80b6-08fef1be550e)

This repository is a monorepo containing the following applications:

- `apps/site`: The website frontend.
- `apps/server`: The backend server.
- `apps/legacy`: The legacy version of the Boluo web application.
- `apps/spa`: The single-page application (SPA).

## Set Up Development Environment

We recommend using the [nix](https://nixos.org/) package manager ([installer](https://github.com/DeterminateSystems/nix-installer)), which is the easiest way to set up the development environment. After installing nix, simply run `nix develop` to enter a shell with all required tools.

If you prefer not to use nix, you can install the following tools manually:

- Rust toolchain: Even if you only plan to develop the frontend, installing Rust is still recommended as code generation depends on it.
  - [cargo-nextest](https://nexte.st/)
- Node.js
- Docker or Podman (recommended)

### Frontend Only Development

For frontend-only development, simply set the `BACKEND_URL` environment variable to point to the staging or production server.

```
echo "BACKEND_URL=https://boluo-server-staging.fly.dev" > .env.local
npm install
npm build
npm run dev:spa
```

You can find testing users in [`apps/server/fixtures/0-users.sql`](https://github.com/mythal/boluo/blob/master/apps/server/fixtures/0-users.sql).

### Full-stack Development

Skip this section if you are only developing the frontend. To develop the server, you must start the development services first.

Rename the example configuration files:

```bash
cp .env.local.example .env.local
# Change ports if needed
cp docker-compose.override.example.yml docker-compose.override.yml
```

Start the development services using `docker-compose`:

```base
docker-compose up -d
```

You need to set up the `DATABASE_URL` environment variable correctly in the `.env.local`. Then initialize the database with fixtures:

```bash
cargo run --bin init -- --fixtures
```

You can find testing users in [`apps/server/fixtures/0-users.sql`](https://github.com/mythal/boluo/blob/master/apps/server/fixtures/0-users.sql).

#### Start Development Servers

```bash
cargo run

npm install
npm build
npm run dev:spa
```

## Checks

You can run the following commands to check code quality and run tests:

- `cargo check` or `cargo clippy` to check Rust code.
- `cargo test` or `cargo nextest run` to run Rust tests.
- `npm run lint` to run frontend linters.
- `npm run check` to run TypeScript type checker.
- `npm run test` to run frontend tests.

## Database Migrations

Generate new migration files using:

```
sqlx migrate add <migration_name> --source apps/server/migrations
```

Generate type-safe query definitions using:

```
cargo sqlx prepare --workspace -- --tests
```

## Credits

Thanks to the following open source projects:

- [缝合像素字体 / Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font/)
- [lucide icons](https://lucide.dev/)
- [Game Icons](https://game-icons.net/)
