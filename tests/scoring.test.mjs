import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreFingerprint, strictBudget, planSummary, missesStrictBudget } from '../src/scoring.ts';

const offer = {
  id: 'plan-1', title: 'Bell EPP BYOD Select 60GB', description: '60GB Canada data',
  brand: 'bell', services: ['byod'], customer_segments: ['epp'], valid_until: '',
  pricing: 'Line 1 net price: $45 (AutoPay included)', eligibility: 'EPP', data_allowance: '60GB',
};
const lead = {
  brand: 'bell', services: ['byod'], customer_type: ['epp'],
  transcript: 'Wants a plan under $50', follow_up_date: '2026-10-01', createdAt: null,
};

test('an unchanged lead and offer snapshot keeps the same score fingerprint', () => {
  const original = scoreFingerprint(lead, [offer], '2026-09-30');
  assert.equal(scoreFingerprint({ ...lead }, [{ ...offer }], '2026-09-30'), original);
  assert.notEqual(scoreFingerprint({ ...lead, transcript: 'Wants a plan under $40' }, [offer], '2026-09-30'), original);
  assert.notEqual(scoreFingerprint(lead, [{ ...offer, pricing: 'Line 1 net price: $40' }], '2026-09-30'), original);
  assert.notEqual(scoreFingerprint(lead, [offer], '2026-10-01'), original);
});

test('plan summary uses the verified Line 1 AutoPay price', () => {
  assert.equal(planSummary(offer), 'Bell EPP BYOD Select 60GB · $45/mo with AutoPay');
  assert.equal(strictBudget('Needs a plan under $45'), 45);
  assert.equal(strictBudget('trying to keep it uonder 50$'), 50);
  assert.equal(strictBudget('Wants a good deal'), null);
  assert.equal(missesStrictBudget({ ...lead, transcript: 'Needs a plan under $45' }, offer), true);
  assert.equal(missesStrictBudget({ ...lead, transcript: 'Needs a plan under $50' }, offer), false);
});
