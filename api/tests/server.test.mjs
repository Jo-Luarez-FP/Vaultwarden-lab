import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, extractSecret } from '../src/server.mjs';

test('custom fields override login; login fallback and invalid fields', () => {
  assert.deepEqual(extractSecret({ fields: [{name:'client_id',value:'id'}, {name:'client_secret',value:'secret'}], login: {username:'other',password:'other'} }), {client_id:'id',client_secret:'secret'});
  assert.deepEqual(extractSecret({login:{username:'id',password:'secret'}}), {client_id:'id',client_secret:'secret'});
  assert.throws(() => extractSecret({}));
  assert.throws(() => extractSecret({fields:[{name:'client_id',value:'a'},{name:'client_id',value:'b'}]}));
});

test('API rejects unauthenticated, browser, and invalid requests without retrieving', async t => {
  const token = 'a'.repeat(48);
  let calls = 0;
  let fail = false;
  const server = createApi({token, fetchSecret:async () => { calls++; if (fail) throw new Error('sensitive diagnostic'); return {client_id:'test',client_secret:'dummy'}; }});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = {Authorization:`Bearer ${token}`};
  assert.equal((await fetch(base+'/secret')).status,401);
  assert.equal((await fetch(base+'/secret',{headers:{Authorization:'Bearer wrong'}})).status,401);
  assert.equal((await fetch(base+'/secret',{headers:{...headers,Origin:'https://example.com'}})).status,403);
  assert.equal((await fetch(base+'/secret?item=other',{headers})).status,404);
  assert.equal((await fetch(base+'/secret',{method:'POST',headers})).status,405);
  assert.equal(calls,0);
  const good = await fetch(base+'/secret',{headers});
  assert.equal(good.status,200);
  assert.equal(good.headers.get('cache-control'),'no-store');
  assert.deepEqual(await good.json(),{client_id:'test',client_secret:'dummy'});
  fail = true;
  const bad = await fetch(base+'/secret',{headers});
  assert.equal(bad.status,503);
  assert.ok(!(await bad.text()).includes('sensitive diagnostic'));
});

