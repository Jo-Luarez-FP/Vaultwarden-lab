# Local Vaultwarden API

Start from the project root with `pnpm start`, or `pnpm api:start` if Docker is already running. Unlock the vault in your terminal. The API token grants access to **all live items readable by that unlocked account**, including personal and accessible organization items. There are no additional organization, collection, or team restrictions in this prototype.

## Postman workflow

Use `http://127.0.0.1:8787` and Authorization → Bearer Token on every request. The token is in `api/.local/api-token.key`. Use Postman Desktop. Restart the API after code changes.

1. `GET /items?search=My%20API` searches item names, case-insensitively. `GET /items` lists all items. The response contains an `items` array with `id`, `name`, `type`, `organizationId`, and `collectionIds`. It contains no field values. Duplicate names are kept as separate results. Deleted items are excluded.
2. Copy an ID and call `GET /items/{id}/fields`. This returns `itemId` and a `fields` array of `field`, `type`, and `retrievable` descriptors, without values.
3. Call `POST /items/{id}/secret`, select Body → raw → JSON, and send:

```json
{ "field": "custom.client_secret" }
```

The result is:

```json
{
  "itemId": "the-selected-item-id",
  "field": "custom.client_secret",
  "value": "the-selected-value"
}
```

Field selectors are case-sensitive. Copy the exact selector from field discovery. Standard examples: `login.username`, `login.password`, `login.totp`, `notes`, `card.number`, `identity.email`, and `sshKey.privateKey`. `login.totp` returns the stored TOTP seed, not a generated code. Custom fields use `custom.` followed by their exact name. Empty values are supported. Duplicate custom field names return 409; rename them in the vault. Linked custom fields are listed as non-retrievable: use their original standard field. Attachments, passkeys, and generated TOTP codes are not exposed by these endpoints.

## Existing endpoint

`GET /secret` and `pnpm api:fetch` still return `client_id` and `client_secret` for the startup item. `pnpm api:start -Item "Exact name or ID"` selects that legacy item only; it does not restrict the new vault-wide endpoints. Default: `My API - Development`.

## Errors

400 invalid query/JSON/field request; 401 missing or incorrect token; 403 browser Origin or invalid Host; 404 item/field/route not found; 405 wrong method; 409 duplicate field; 413 body exceeds 4 KiB; 415 body is not application/json; 429 another request is running; 503 vault/CLI unavailable. Backend diagnostics are not sent to clients.

## Local setup and scope

From the project root, install dependencies with `pnpm install --frozen-lockfile`. On a new checkout, copy the Caddy public CA certificate:

```powershell
New-Item -ItemType Directory api/.local -Force
docker cp vaultwarden-caddy:/data/caddy/pki/authorities/local/root.crt api/.local/caddy-local-root.crt
```

The launcher uses NODE_EXTRA_CA_CERTS without disabling HTTPS verification. Your master password is entered at the CLI prompt; the session remains in memory. Press Ctrl+C to stop and run the CLI lock cleanup. Docker remains running. The encrypted CLI cache and API token stay in ignored `api/.local`; do not share that folder. Remove the token file while stopped to rotate it on next launch.

The API binds to loopback, requires a bearer token, rejects browser Origin headers, and marks all responses no-store. One vault operation runs at a time. Each new endpoint syncs and reads the vault through the CLI, then filters in memory. This is intended for a small local vault; pagination, efficient lookup, and scoped machine identities remain future work. It exposes no write operations.

Run `pnpm test` for synthetic-data tests. Real-vault requests require your own unlock. Reference: https://bitwarden.com/help/cli/
