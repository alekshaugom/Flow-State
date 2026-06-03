import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  computeBalance,
  applyEntry,
  bountyEscrow,
  summarizeForProfile,
  validateAmount,
  MAX_AMOUNT_CENTS,
  type LedgerType,
} from '../lib/ledger/ledger-pure.ts';

// ---------------------------------------------------------------------------
// computeBalance
// ---------------------------------------------------------------------------
test('computeBalance: empty → 0', () => {
  assert.equal(computeBalance([]), 0);
});

test('computeBalance: signed sum', () => {
  const entries = [
    { amountCents: 5000 },
    { amountCents: -2000 },
    { amountCents: 1000 },
  ];
  assert.equal(computeBalance(entries), 4000);
});

test('computeBalance: single grant', () => {
  assert.equal(computeBalance([{ amountCents: 10000 }]), 10000);
});

// ---------------------------------------------------------------------------
// applyEntry — sign rules
// ---------------------------------------------------------------------------
test('applyEntry: grant must be positive', () => {
  const r = applyEntry(0, 'grant', -100);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /positive/i);
});

test('applyEntry: bounty_fund must be negative', () => {
  const r = applyEntry(5000, 'bounty_fund', 1000);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /negative/i);
});

test('applyEntry: bounty_refund must be positive', () => {
  const r = applyEntry(0, 'bounty_refund', -500);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /positive/i);
});

test('applyEntry: bounty_award must be positive', () => {
  const r = applyEntry(0, 'bounty_award', -100);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /positive/i);
});

test('applyEntry: platform_fee must be negative', () => {
  const r = applyEntry(5000, 'platform_fee', 100);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /negative/i);
});

test('applyEntry: zero amount rejected', () => {
  const r = applyEntry(5000, 'grant', 0);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /nonzero/i);
});

test('applyEntry: non-integer rejected', () => {
  const r = applyEntry(5000, 'grant', 100.5);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /nonzero integer/i);
});

// ---------------------------------------------------------------------------
// applyEntry — no-overdraft
// ---------------------------------------------------------------------------
test('applyEntry: overdraft rejected (debit > balance)', () => {
  const r = applyEntry(1000, 'bounty_fund', -2000);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /insufficient/i);
});

test('applyEntry: exact balance debit accepted', () => {
  const r = applyEntry(2000, 'bounty_fund', -2000);
  assert.equal(r.ok, true);
  assert.equal((r as any).balanceAfter, 0);
});

test('applyEntry: valid grant', () => {
  const r = applyEntry(1000, 'grant', 5000);
  assert.equal(r.ok, true);
  assert.equal((r as any).balanceAfter, 6000);
});

test('applyEntry: valid bounty_fund', () => {
  const r = applyEntry(5000, 'bounty_fund', -3000);
  assert.equal(r.ok, true);
  assert.equal((r as any).balanceAfter, 2000);
});

test('applyEntry: bounty_award credits awardee', () => {
  const r = applyEntry(0, 'bounty_award', 3000);
  assert.equal(r.ok, true);
  assert.equal((r as any).balanceAfter, 3000);
});

// ---------------------------------------------------------------------------
// bountyEscrow — escrow conservation
// ---------------------------------------------------------------------------
test('bountyEscrow: fund → award conserves to 0', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'bounty_fund',  amountCents: -3000 },
    { type: 'bounty_award', amountCents:  3000 },
  ];
  assert.equal(bountyEscrow(entries), 0);
});

test('bountyEscrow: fund → refund conserves to 0', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'bounty_fund',   amountCents: -2000 },
    { type: 'bounty_refund', amountCents:  2000 },
  ];
  assert.equal(bountyEscrow(entries), 0);
});

test('bountyEscrow: multi-funder pot', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'bounty_fund', amountCents: -1000 },
    { type: 'bounty_fund', amountCents: -2000 },
  ];
  assert.equal(bountyEscrow(entries), 3000);
});

test('bountyEscrow: partial refund', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'bounty_fund',   amountCents: -3000 },
    { type: 'bounty_refund', amountCents:  1000 },
  ];
  assert.equal(bountyEscrow(entries), 2000);
});

test('bountyEscrow: empty → 0', () => {
  assert.equal(bountyEscrow([]), 0);
});

// ---------------------------------------------------------------------------
// summarizeForProfile
// ---------------------------------------------------------------------------
test('summarizeForProfile: aggregates by type', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'grant',        amountCents:  5000 },
    { type: 'bounty_fund',  amountCents: -2000 },
    { type: 'bounty_award', amountCents:  3000 },
  ];
  const s = summarizeForProfile(entries);
  assert.equal(s.putInCents,     5000);
  assert.equal(s.collectedCents, 3000);
  assert.equal(s.extractedCents, 0);    // always 0 in slice 22
  assert.equal(s.fundedCents,    2000);
  assert.equal(s.balanceCents,   6000); // 5000 - 2000 + 3000
});

test('summarizeForProfile: empty → all zeros', () => {
  const s = summarizeForProfile([]);
  assert.equal(s.putInCents,     0);
  assert.equal(s.collectedCents, 0);
  assert.equal(s.extractedCents, 0);
  assert.equal(s.fundedCents,    0);
  assert.equal(s.balanceCents,   0);
});

test('summarizeForProfile: platform_fee counts in balance but not in named metrics', () => {
  const entries: { type: LedgerType; amountCents: number }[] = [
    { type: 'grant',        amountCents:  5000 },
    { type: 'platform_fee', amountCents:  -100 },
  ];
  const s = summarizeForProfile(entries);
  assert.equal(s.putInCents,   5000);
  assert.equal(s.balanceCents, 4900);
  assert.equal(s.fundedCents,  0);
});

// ---------------------------------------------------------------------------
// validateAmount
// ---------------------------------------------------------------------------
test('validateAmount: valid amount', () => {
  assert.deepEqual(validateAmount(1000), { ok: true });
});

test('validateAmount: 0 → error', () => {
  const r = validateAmount(0);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /positive/i);
});

test('validateAmount: negative → error', () => {
  const r = validateAmount(-100);
  assert.equal(r.ok, false);
});

test('validateAmount: non-integer → error', () => {
  const r = validateAmount(100.5);
  assert.equal(r.ok, false);
});

test('validateAmount: MAX_AMOUNT_CENTS → ok', () => {
  assert.deepEqual(validateAmount(MAX_AMOUNT_CENTS), { ok: true });
});

test('validateAmount: over MAX → error', () => {
  const r = validateAmount(MAX_AMOUNT_CENTS + 1);
  assert.equal(r.ok, false);
  assert.match((r as any).error, /≤/);
});
