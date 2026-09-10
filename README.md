# Vaultwarden lab

Run these commands from C:\Projects\Vaultwarden-lab.

- `pnpm start`: start Docker services, then prompt to unlock the vault and start the local API.
- `pnpm docker:up`: start Docker services only.
- `pnpm docker:stop`: stop Docker services, preserving data.
- `pnpm docker:status`: show container status.
- `pnpm api:start`: unlock and start the API for the default item My API - Development.
- `pnpm api:start -Item "Exact item name or ID"`: start the API for a different item.
- `pnpm api:fetch`: call the API and display credentials (run in a second terminal).
- `pnpm test`: run API tests with synthetic data.

Docker Desktop must be running and docker must be available in your terminal. Leave the API terminal open; Ctrl+C stops the API and runs the CLI lock cleanup. Docker services continue running until stopped separately.

Install API dependencies with `pnpm install --frozen-lockfile` on a new checkout. See api/README.md for the local certificate setup and API details. Keep vw-data and api/.local out of Git.

