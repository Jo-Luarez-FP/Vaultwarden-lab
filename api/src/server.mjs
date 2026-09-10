import { API, ERROR, FILE, MESSAGE } from './constants.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApi } from './http-api.mjs';
import { createSecretReader, createVaultService } from './vault-client.mjs';

export { createApi } from './http-api.mjs';
export { extractSecret } from './vault-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readConfiguration() {
  const token = readFileSync(
    path.join(root, FILE.TOKEN),
    FILE.ENCODING,
  ).trim();
  const itemRef = process.env.VAULT_ITEM;

  if (!process.env.BW_SESSION || !itemRef || itemRef.startsWith('-')) {
    throw new Error(ERROR.UNLOCK_REQUIRED);
  }

  return { token, itemRef };
}

function startServer() {
  const { token, itemRef } = readConfiguration();
  const server = createApi({
    token,
    fetchSecret: createSecretReader(root, itemRef),
    vault: createVaultService(root),
  });

  server.listen(API.PORT, API.HOST, () => {
    console.log(
      MESSAGE.READY,
    );
  });

  server.on('error', () => {
    console.error(MESSAGE.START_FAILED);
    process.exitCode = 1;
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startServer();
}


