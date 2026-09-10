import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/http-api.mjs';
import { createSecretReader } from '../src/vault-client.mjs';

test('reader syncs before retrieving and requires a live exact match', async () => {
  const calls = [];
  let item = { id: '123', name: 'Demo', login: { username: 'id', password: 'dummy' } };
  const run = async (args) => {
    calls.push(args);
    return JSON.stringify(item);
  };
  const read = createSecretReader('/unused', 'Demo', run);

  assert.deepEqual(await read(), { client_id: 'id', client_secret: 'dummy' });
  assert.deepEqual(calls, [['sync'], ['get', 'item', 'Demo']]);
  item = { ...item, name: 'Demo extra' };
  await assert.rejects(read, /Exact item required/);
  assert.deepEqual(await createSecretReader('/unused', '123', run)(), {
    client_id: 'id', client_secret: 'dummy',
  });
  item.deletedDate = '2026-09-10';
  await assert.rejects(createSecretReader('/unused', '123', run), /Exact item required/);
});

test('overlapping retrieval is rejected and failure releases the busy state', async (t) => {
  const token = 'x'.repeat(48);
  let fail;
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  let calls = 0;
  const server = createApi({
    token,
    fetchSecret: async () => {
      calls++;
      if (calls > 1) return { client_id: 'id', client_secret: 'dummy' };
      entered();
      return new Promise((resolve, reject) => { fail = reject; });
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/secret`;
  const headers = { Authorization: `Bearer ${token}` };
  const first = fetch(url, { headers });
  await started;
  try {
    assert.equal((await fetch(url, { headers })).status, 429);
    assert.equal(calls, 1);
  } finally {
    fail(new Error('private error'));
  }
  assert.equal((await first).status, 503);
  assert.equal((await fetch(url, { headers })).status, 200);
});
