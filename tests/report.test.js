/**
 * Parent-screen helpers: config switches and read-only reports.
 * Run with `npm test`.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { INPUT_MODES, defaultConfig, setPlanetTable, setTableUnlocked } from '../src/core/config.js';
import { STATES, dayKey, newFactRecord } from '../src/core/mastery.js';
import { createProfile } from '../src/core/profile.js';
import { factGrid, planetProgress, thresholdStatus } from '../src/core/report.js';

const { TYPED, MC } = INPUT_MODES;
const at = d => new Date(2026, 9, d, 18, 30).getTime();

describe('config switches', () => {
    test('unlock and lock a table without changing the input config', () => {
        const config = defaultConfig();
        const withTwo = setTableUnlocked(config, 2, true);
        assert.deepEqual(withTwo.unlockedTables, [2, 10]);
        assert.deepEqual(config.unlockedTables, [10]);
        assert.deepEqual(setTableUnlocked(withTwo, 2, true).unlockedTables, [2, 10]);
        assert.deepEqual(setTableUnlocked(withTwo, 10, false).unlockedTables, [2]);
    });

    test('invalid tables and planets are refused', () => {
        assert.throws(() => setTableUnlocked(defaultConfig(), 11, true));
        assert.throws(() => setTableUnlocked(defaultConfig(), '2', true));
        assert.throws(() => setPlanetTable(defaultConfig(), 'pluto', 3));
    });

    test('the planet mapping can be reshuffled', () => {
        const swapped = setPlanetTable(setPlanetTable(defaultConfig(), 'mercurius', 5), 'venus', 2);
        assert.equal(swapped.tableForPlanet.mercurius, 5);
        assert.equal(swapped.tableForPlanet.venus, 2);
    });
});

describe('parent report', () => {
    test('fact grid is 10 × 10; untested stays untested with no numbers', () => {
        const profile = createProfile('Max', at(1));
        profile.facts['7x8'] = {
            ...newFactRecord(), state: STATES.LEREN, correct: 3, wrong: 1,
            latencies: { [TYPED]: [3000, 1000, 2000], [MC]: [] },
        };
        const grid = factGrid(profile);
        assert.equal(grid.length, 10);
        assert.ok(grid.every(row => row.facts.length === 10));

        const cell = grid[6].facts[7];
        assert.deepEqual([cell.id, cell.state, cell.medianMs[TYPED], cell.medianMs[MC]], ['7x8', STATES.LEREN, 2000, null]);
        assert.deepEqual(grid[1].facts[2], {
            id: '2x3', state: STATES.UNTESTED, correct: 0, wrong: 0, lastSeenAt: null, medianMs: { typed: null, mc: null },
        });
    });

    test('planet progress follows the configured mapping and unlocks', () => {
        let profile = createProfile('Max', at(1));
        profile.facts['10x1'] = { ...newFactRecord(), state: STATES.VLOT, correct: 4 };
        profile.facts['10x2'] = { ...newFactRecord(), state: STATES.LEREN, wrong: 2 };

        const maan = planetProgress(profile).find(p => p.planetId === 'maan');
        assert.deepEqual([maan.table, maan.unlocked, maan.answeredCorrectly, maan.total], [10, true, 1, 10]);
        assert.deepEqual(maan.counts, { untested: 8, leren: 1, vlot: 1, beheerst: 0 });
        assert.equal(planetProgress(profile).find(p => p.planetId === 'mercurius').unlocked, false);

        profile = { ...profile, config: setPlanetTable(profile.config, 'maan', 2) };
        assert.equal(planetProgress(profile).find(p => p.planetId === 'maan').counts.untested, 10);
    });

    test('threshold status: calibrating shows days, never a number', () => {
        const profile = createProfile('Max', at(1));
        profile.config.calibrationDays[TYPED] = [dayKey(at(1)), dayKey(at(2))];
        assert.deepEqual(thresholdStatus(profile, TYPED), {
            inputMode: TYPED, daysLogged: 2, daysNeeded: 7,
            calibrating: true, ms: null, source: null, samples: null, computedAt: null,
        });

        profile.config.calibrationDays[MC] = [1, 2, 3, 4, 5, 6, 7].map(d => dayKey(at(d)));
        const mc = thresholdStatus(profile, MC);
        assert.deepEqual([mc.calibrating, mc.ms, mc.source], [false, 3500, 'fallback']);
    });
});
