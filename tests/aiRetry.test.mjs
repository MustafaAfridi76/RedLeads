import test from 'node:test';
import assert from 'node:assert/strict';
import { requestWithModelFallback } from '../src/aiRetry.ts';

test('a provider overload uses the next model and returns its real response', async () => {
  const attempted = [];
  const response = await requestWithModelFallback(['primary', 'fallback'], async model => {
    attempted.push(model);
    if (model === 'primary') throw Object.assign(new Error('high demand'), {customErrorData:{status:500}});
    return 'real AI response';
  }, {timeoutMs:100});
  assert.deepEqual(attempted, ['primary', 'fallback']);
  assert.deepEqual(response, {model:'fallback', result:'real AI response'});
});

test('App Check rejection is surfaced without trying another model', async () => {
  let attempts = 0;
  await assert.rejects(requestWithModelFallback(['primary', 'fallback'], async () => {
    attempts++;
    throw Object.assign(new Error('App Check rejected'), {customErrorData:{status:403}});
  }, {timeoutMs:100}), /App Check rejected/);
  assert.equal(attempts, 1);
});

test('a hanging request is aborted and the fallback completes', async () => {
  let firstSignal;
  const response = await requestWithModelFallback(['primary', 'fallback'], async (model, signal) => {
    if (model === 'primary') {
      firstSignal = signal;
      return new Promise(() => {});
    }
    return 'response';
  }, {timeoutMs:10});
  assert.equal(firstSignal.aborted, true);
  assert.equal(response.result, 'response');
});

test('cancelling a PDF request prevents fallback attempts', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const request = requestWithModelFallback(['primary', 'fallback'], async () => {
    attempts++;
    return new Promise(() => {});
  }, {timeoutMs:100,signal:controller.signal});
  controller.abort(new Error('PDF cancelled'));
  await assert.rejects(request, /PDF cancelled/);
  assert.equal(attempts, 1);
});
