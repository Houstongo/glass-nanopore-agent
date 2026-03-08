import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_PHASES,
    buildControlEvents,
    buildMockTrace,
    buildSystemEvents,
    getPhaseForProgress,
    pickNearestTraceIndex,
} from './EtchingConsole.model.js';

test('getPhaseForProgress returns etching phase for mid-process progress', () => {
    const phase = getPhaseForProgress(42, DEFAULT_PHASES);
    assert.equal(phase.id, 'etching');
});

test('buildMockTrace generates packets with stage and packet metadata', () => {
    const trace = buildMockTrace(12, DEFAULT_PHASES);
    assert.equal(trace.length, 12);
    assert.equal(trace[0].phaseId, 'idle');
    assert.equal(typeof trace[5].packetSeq, 'number');
    assert.equal(typeof trace[5].current, 'number');
});

test('event builders keep items inside 0-100 progress range', () => {
    const controls = buildControlEvents();
    const system = buildSystemEvents();
    assert.equal(controls.every((event) => event.progress >= 0 && event.progress <= 100), true);
    assert.equal(system.every((event) => event.progress >= 0 && event.progress <= 100), true);
});

test('pickNearestTraceIndex selects closest sample to the cursor progress', () => {
    const trace = buildMockTrace(5, DEFAULT_PHASES);
    const index = pickNearestTraceIndex(trace, 76);
    assert.equal(index, 3);
});
