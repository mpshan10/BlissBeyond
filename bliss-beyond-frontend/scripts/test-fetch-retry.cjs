const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const mainSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'prototype', 'assets', 'js', 'main.js'), 'utf8');
const fetchWrapperSource = mainSource.split('const BB_STATE_KEYS')[0];

function createHarness(outcomes) {
  let calls = 0;
  const nativeFetch = async () => {
    const outcome = outcomes[Math.min(calls, outcomes.length - 1)];
    calls += 1;
    if (outcome instanceof Error) throw outcome;
    return { status: outcome, ok: outcome >= 200 && outcome < 300 };
  };
  const window = {
    location: { hostname: 'bliss-beyond.vercel.app' },
    fetch: nativeFetch,
    setTimeout: (callback) => callback()
  };
  vm.runInNewContext(fetchWrapperSource, { window, URL, TypeError, Error, Promise });
  return { fetch: window.fetch, calls: () => calls };
}

async function expectNoReplay(method, status, pathName) {
  const harness = createHarness([status, 200]);
  await assert.rejects(
    harness.fetch(`https://blissbeyond.onrender.com${pathName}`, { method }),
    /couldn't confirm whether this request completed/
  );
  assert.equal(harness.calls(), 1, `${method} must not be replayed`);
}

(async () => {
  const getHarness = createHarness([503, 200]);
  const response = await getHarness.fetch('https://blissbeyond.onrender.com/api/packages', { method: 'GET' });
  assert.equal(response.status, 200);
  assert.equal(getHarness.calls(), 2, 'GET should use one bounded retry');

  await expectNoReplay('POST', 503, '/api/bookings');
  await expectNoReplay('PATCH', 502, '/api/admin/payments/1/confirm');
  await expectNoReplay('DELETE', 504, '/api/events/1');
  await expectNoReplay('POST', 503, '/api/customer/bookings/1/payments');

  const networkHarness = createHarness([new TypeError('network failed'), 200]);
  await assert.rejects(
    networkHarness.fetch('https://blissbeyond.onrender.com/api/bookings', { method: 'POST' }),
    /couldn't confirm whether this request completed/
  );
  assert.equal(networkHarness.calls(), 1, 'network failures must not replay mutations');

  console.log('PASS fetch retry policy');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
