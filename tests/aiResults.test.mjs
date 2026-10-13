import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScoreResults } from '../src/aiResults.ts';

test('accepts both legitimate scoring response shapes', () => {
  const score = {id:'lead-1',heat_score:40,heat_reason:'Near match'};
  assert.deepEqual(parseScoreResults(JSON.stringify({results:[score]}), ['lead-1']), [score]);
  assert.deepEqual(parseScoreResults(JSON.stringify([score]), ['lead-1']), [score]);
});

test('missing and duplicate lead scores cannot be reported as successful', () => {
  assert.throws(() => parseScoreResults('{"results":[]}', ['lead-1']), /exactly one/);
  assert.throws(() => parseScoreResults('{"results":[{"id":"lead-1"},{"id":"lead-1"}]}', ['lead-1']), /exactly one/);
  assert.throws(() => parseScoreResults('unfinished JSON', ['lead-1']), /incomplete/);
});
