import { ApiError } from './api-error.mjs';
import { describeFields, readField } from './item-fields.mjs';
import { CLI, ERROR, FILE, VAULT_FIELD, HTTP_STATUS } from './constants.mjs';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

function customField(item, name) {
  const matches = (item.fields ?? []).filter((field) => field.name === name);

  if (matches.length > 1) {
    throw new Error(ERROR.DUPLICATE_FIELD);
  }

  return matches[0]?.value;
}

function requireValue(value) {
  if (typeof value !== 'string' || !value) {
    throw new Error(ERROR.MISSING_FIELDS);
  }

  return value;
}

export function extractSecret(item) {
  return {
    [VAULT_FIELD.CLIENT_ID]: requireValue(customField(item, VAULT_FIELD.CLIENT_ID) ?? item.login?.username),
    [VAULT_FIELD.CLIENT_SECRET]: requireValue(
      customField(item, VAULT_FIELD.CLIENT_SECRET) ?? item.login?.password,
    ),
  };
}

function resolveCli(root) {
  const packageRoot = path.join(root, FILE.CLI_PACKAGE);
  const cliPackage = JSON.parse(
    readFileSync(path.join(packageRoot, FILE.PACKAGE_MANIFEST), FILE.ENCODING),
  );
  const executable =
    typeof cliPackage.bin === 'string' ? cliPackage.bin : cliPackage.bin.bw;

  return path.join(packageRoot, executable);
}

function createCliRunner(root) {
  const cli = resolveCli(root);

  return async (args) => {
    const { stdout } = await exec(process.execPath, [cli, ...args], {
      timeout: CLI.TIMEOUT_MS,
      maxBuffer: CLI.MAX_BUFFER_BYTES,
      windowsHide: true,
    });

    return stdout;
  };
}

function validateItem(item, itemRef) {
  if (item.deletedDate) {
    throw new Error(ERROR.EXACT_ITEM_REQUIRED);
  }

  if (item.id !== itemRef && item.name !== itemRef) {
    throw new Error(ERROR.EXACT_ITEM_REQUIRED);
  }
}

export function createSecretReader(root, itemRef, run = createCliRunner(root)) {
  return async () => {
    await run([CLI.SYNC]);
    const item = JSON.parse(await run([CLI.GET, CLI.ITEM, itemRef]));
    validateItem(item, itemRef);
    return extractSecret(item);
  };
}


function summarizeItem(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    organizationId: item.organizationId ?? null,
    collectionIds: item.collectionIds ?? [],
  };
}

export function createVaultService(root, run = createCliRunner(root)) {
  async function items() {
    await run([CLI.SYNC]);
    const result = JSON.parse(await run([CLI.LIST, CLI.ITEMS]));
    return result.filter((item) => !item.deletedDate);
  }

  async function getItem(id) {
    const item = (await items()).find((entry) => entry.id === id);
    if (!item) throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR.ITEM_NOT_FOUND);
    return item;
  }

  return {
    async search(query) {
      const needle = query.toLowerCase();
      const matches = (await items()).filter((item) => item.name.toLowerCase().includes(needle));
      return { items: matches.map(summarizeItem) };
    },
    async fields(id) {
      const item = await getItem(id);
      return { itemId: id, fields: describeFields(item) };
    },
    async secret(id, selector) {
      return readField(await getItem(id), selector);
    },
  };
}

