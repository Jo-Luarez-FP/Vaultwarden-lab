import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/http-api.mjs';
import { createVaultService } from '../src/vault-client.mjs';

const id = '11111111-1111-1111-1111-111111111111';
const otherId = '22222222-2222-2222-2222-222222222222';
const token = 't'.repeat(48);
const headers = { Authorization: `Bearer ${token}` };
const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

async function setup(t) {
  const state = {
    calls: [],
    fail: false,
    items: [
      { id, name: 'My API', type: 1, login: { password: 'private-password' },
        fields: [{ name: 'client_secret', type: 1, value: 'private-custom' },
          { name: 'empty', type: 0, value: '' }] },
      { id: otherId, name: 'My API', type: 2, organizationId: 'org', collectionIds: ['team'], notes: 'private-notes' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Deleted', deletedDate: '2026-09-10' },
    ],
  };
  const run = async (args) => {
    state.calls.push(args);
    if (state.fail) throw new Error('private-cli-error');
    return JSON.stringify(state.items);
  };
  const server = createApi({ token, vault: createVaultService('/unused', run) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { state, url: `http://127.0.0.1:${server.address().port}` };
}

test('search covers personal and shared items, preserves duplicate names, and omits values', async (t) => {
  const { url, state } = await setup(t);
  const response = await fetch(`${url}/items?search=my%20api`, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.deepEqual(body.items.map((item) => item.id), [id, otherId]);
  assert.equal(body.items[1].organizationId, 'org');
  assert.ok(!JSON.stringify(body).includes('private-'));
  assert.deepEqual(state.calls, [['sync'], ['list', 'items']]);
  assert.deepEqual(await (await fetch(`${url}/items?search=private`, { headers })).json(), { items: [] });
  assert.equal((await (await fetch(`${url}/items`, { headers })).json()).items.length, 2);
});

test('field discovery returns descriptors and retrieval returns only the selected value', async (t) => {
  const { url } = await setup(t);
  const fields = await (await fetch(`${url}/items/${id}/fields`, { headers })).json();
  assert.deepEqual(fields.fields.map((entry) => entry.field), ['login.password', 'custom.client_secret', 'custom.empty']);
  assert.ok(!JSON.stringify(fields).includes('private-'));
  for (const [field, value] of [['custom.client_secret', 'private-custom'], ['login.password', 'private-password'], ['custom.empty', '']]) {
    const response = await fetch(`${url}/items/${id}/secret`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ field }) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { itemId: id, field, value });
  }
  const note = await fetch(`${url}/items/${otherId}/secret`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ field: 'notes' }) });
  assert.equal((await note.json()).value, 'private-notes');
});

test('all routes enforce auth and reject invalid requests before accessing the vault', async (t) => {
  const { url, state } = await setup(t);
  for (const route of ['/items', `/items/${id}/fields`, `/items/${id}/secret`]) {
    assert.equal((await fetch(url + route)).status, 401);
    assert.equal((await fetch(url + route, { headers: { ...headers, Origin: 'https://example.com' } })).status, 403);
  }
  assert.equal((await fetch(`${url}/items/--help/fields`, { headers })).status, 404);
  assert.equal((await fetch(`${url}/items?token=bad`, { headers })).status, 400);
  assert.equal((await fetch(`${url}/items?search=a&search=b`, { headers })).status, 400);
  assert.equal((await fetch(`${url}/items/${id}/secret`, { headers })).status, 405);
  for (const body of ['{', '{}', '{"field":2}', '{"field":"notes","extra":true}']) {
    assert.equal((await fetch(`${url}/items/${id}/secret`, { method: 'POST', headers: jsonHeaders, body })).status, 400);
  }
  assert.equal((await fetch(`${url}/items/${id}/secret`, { method: 'POST', headers, body: '{}' })).status, 415);
  assert.equal((await fetch(`${url}/items/${id}/secret`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ field: 'a'.repeat(5000) }) })).status, 413);
  assert.equal(state.calls.length, 0);
});

test('missing, deleted, duplicate, and linked fields fail clearly; CLI failures stay private', async (t) => {
  const { url, state } = await setup(t);
  const post = (field) => fetch(`${url}/items/${id}/secret`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ field }) });
  assert.equal((await post('constructor')).status, 404);
  assert.equal((await fetch(`${url}/items/33333333-3333-3333-3333-333333333333/fields`, { headers })).status, 404);
  state.items[0].fields.push({ name: 'client_secret', type: 1, value: 'another' });
  assert.equal((await post('custom.client_secret')).status, 409);
  state.items[0].fields.push({ name: 'linked', type: 3, value: null });
  assert.equal((await post('custom.linked')).status, 400);
  state.fail = true;
  const failure = await fetch(`${url}/items`, { headers });
  assert.equal(failure.status, 503);
  assert.ok(!(await failure.text()).includes('private-cli-error'));
});
