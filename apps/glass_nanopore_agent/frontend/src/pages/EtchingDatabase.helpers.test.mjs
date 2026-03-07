import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAngleDiff } from './EtchingDatabase.helpers.js';

test('formatAngleDiff returns placeholder for null-like values', () => {
    assert.equal(formatAngleDiff(null), '--');
    assert.equal(formatAngleDiff(undefined), '--');
    assert.equal(formatAngleDiff(Number.NaN), '--');
});

test('formatAngleDiff preserves one decimal place for numeric values', () => {
    assert.equal(formatAngleDiff(1.234), '1.2');
    assert.equal(formatAngleDiff(0), '0.0');
});
