/**
 * Core engine tests: synthetic answer streams in, asserted state transitions out.
 * Run with `npm test` (node:test, no dependencies, no browser).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
    SHAPES, isShapeActive, makeQuestion, parseFactId, siblingId, tableFacts,
} from '../src/core/facts.js';
import { INPUT_MODES, LEVELS, PLANETS, defaultConfig, unlockedFactIds } from '../src/core/config.js';
import { createLatencyClock } from '../src/core/clock.js';
import {
    STATES, activeThreshold, applyAnswer, computeThreshold, dayKey, isCalibrating, median,
    newFactRecord, recordAnswer, refreshThreshold,
} from '../src/core/mastery.js';
import { WEIGHTS, createSelector, factWeight, weightedPick } from '../src/core/selector.js';
import {
    KEY_PREFIX, ProfileError, createProfile, createProfileStore, exportProfile, importProfile,
    recordSession, slugify,
} from '../src/core/profile.js';

const { TYPED, MC } = INPUT_MODES;
const { UNTESTED, LEREN, VLOT, BEHEERST } = STATES;
const DAY_MS = 24 * 60 * 60 * 1000;

// Local-time evening on day `d` of October 2026, plus `min` minutes.
const at = (d, min = 0) => new Date(2026, 9, d, 18, 30 + min).getTime();

function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function memoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        get length() { return map.size; },
        key: i => [...map.keys()][i] ?? null,
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key),
    };
}

const withState = (state, overrides = {}) => ({ ...newFactRecord(), state, ...overrides });

/** Feed answers to one record. Step: [day, correct, latencyMs = 1000, inputMode = TYPED, extra = {}]. */
function play(record, steps, { thresholdMs = 3000 } = {}) {
    let rec = record;
    steps.forEach(([day, correct, latencyMs = 1000, inputMode = TYPED, extra = {}], i) => {
        rec = applyAnswer(rec, { correct, latencyMs, inputMode, at: at(day, i), thresholdMs, ...extra }).record;
    });
    return rec;
}

/** A profile whose typed mode is past calibration with a 3000ms threshold. */
function calibratedProfile(facts = {}) {
    const profile = createProfile('Test', at(1));
    profile.config.calibrationDays[TYPED] = [1, 2, 3, 4, 5, 6, 7].map(d => dayKey(at(d)));
    profile.config.thresholds[TYPED] = {
        ms: 3000, source: 'calibrated', samples: 40, computedAt: new Date(at(8)).toISOString(),
    };
    profile.facts = facts;
    return profile;
}

const isProfileError = code => error => error instanceof ProfileError && error.code === code;

describe('facts', () => {
    test('a table is ten facts a×1 … a×10', () => {
        const facts = tableFacts(7);
        assert.equal(facts.length, 10);
        assert.deepEqual(facts.map(f => f.id), ['7x1', '7x2', '7x3', '7x4', '7x5', '7x6', '7x7', '7x8', '7x9', '7x10']);
        assert.equal(facts[7].product, 56);
    });

    test('7x8 and 8x7 are siblings; squares have none', () => {
        assert.equal(siblingId('7x8'), '8x7');
        assert.equal(siblingId('8x7'), '7x8');
        assert.equal(siblingId('6x6'), null);
    });

    test('MULT is active; MISSING and DIV are built but disabled', () => {
        assert.deepEqual(makeQuestion('7x8'), { factId: '7x8', shape: SHAPES.MULT, text: '7 × 8 = ?', answer: 56 });
        assert.equal(makeQuestion('7x8', SHAPES.MISSING).text, '7 × ? = 56');
        assert.equal(makeQuestion('7x8', SHAPES.MISSING).answer, 8);
        assert.equal(makeQuestion('7x8', SHAPES.DIV).text, '56 : 7 = ?');
        assert.equal(makeQuestion('7x8', SHAPES.DIV).answer, 8);
        assert.equal(isShapeActive(SHAPES.MULT), true);
        assert.equal(isShapeActive(SHAPES.MISSING), false);
        assert.equal(isShapeActive(SHAPES.DIV), false);
    });

    test('invalid fact ids throw', () => {
        assert.throws(() => parseFactId('7*8'));
        assert.throws(() => makeQuestion('7x8', 'SQUARE'));
    });
});

describe('config', () => {
    test('October start: only the tafel van 10 is unlocked', () => {
        const pool = unlockedFactIds(defaultConfig());
        assert.equal(pool.length, 10);
        assert.ok(pool.every(id => id.startsWith('10x')));
    });

    test('planet ↔ table mapping lives in config', () => {
        const { tableForPlanet } = defaultConfig();
        assert.equal(tableForPlanet.maan, 10);
        assert.equal(tableForPlanet.mercurius, 2);
        assert.equal(tableForPlanet.venus, 5);
        assert.deepEqual(Object.values(tableForPlanet).sort((a, b) => a - b), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
        assert.equal(PLANETS.length, 9);
    });

    test('Reis is typed, Warp is multiple choice', () => {
        assert.equal(LEVELS.reis.inputMode, TYPED);
        assert.equal(LEVELS.warp.inputMode, MC);
    });
});

describe('mastery: promotion', () => {
    test('untested → leren on the first correct answer', () => {
        const { record, from, to } = applyAnswer(undefined,
            { correct: true, latencyMs: 1500, inputMode: TYPED, at: at(1), thresholdMs: null });
        assert.equal(from, UNTESTED);
        assert.equal(to, LEREN);
        assert.equal(record.streak, 0);
        assert.equal(record.correct, 1);
    });

    test('leren → vlot needs 3 credited correct answers on 3 different days', () => {
        let rec = play(undefined, [[1, true], [1, true], [1, true], [1, true]]);
        assert.equal(rec.state, LEREN);
        assert.equal(rec.streak, 0, 'repeats inside the entry session earn nothing');

        rec = play(rec, [[2, true], [2, true]]);
        assert.equal(rec.streak, 1, 'one credit per fact per session');

        rec = play(rec, [[3, true]]);
        assert.equal(rec.state, LEREN);
        assert.equal(rec.streak, 2);

        rec = play(rec, [[4, true]]);
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 0);
        assert.deepEqual(rec.sessionsCredited, ['2026-10-02', '2026-10-03', '2026-10-04']);
    });

    test('leren → vlot at any speed, in either mode', () => {
        const rec = play(withState(LEREN), [[1, true, 9000, MC], [2, true, 9000, MC], [3, true, 9000, MC]]);
        assert.equal(rec.state, VLOT);
    });

    test('a miss re-queue repeat never earns credit', () => {
        const rec = play(withState(LEREN, { streak: 2 }), [[5, true, 1000, TYPED, { isRepeat: true }]]);
        assert.equal(rec.state, LEREN);
        assert.equal(rec.streak, 2);
    });

    test('vlot → beheerst needs 3 fast typed answers spanning sessions', () => {
        let rec = play(withState(VLOT), [[1, true], [2, true]]);
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 2);

        rec = play(rec, [[3, true]]);
        assert.equal(rec.state, BEHEERST);
        assert.ok(new Set(rec.sessionsCredited).size >= 2);
    });

    test('three fast answers inside one session do not reach beheerst', () => {
        const rec = play(withState(VLOT), [[1, true], [1, true], [1, true]]);
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 1);
    });

    test('multiple choice can never earn beheerst', () => {
        const rec = play(withState(VLOT), [1, 2, 3, 4, 5, 6].map(d => [d, true, 800, MC]));
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 0);
    });

    test('a slow typed answer breaks the vlot streak', () => {
        let rec = play(withState(VLOT), [[1, true], [2, true], [3, true, 4000]]);
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 0);

        rec = play(rec, [[4, true], [5, true], [6, true]]);
        assert.equal(rec.state, BEHEERST);
    });

    test('nothing reaches beheerst while calibrating (no threshold yet)', () => {
        const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => [d, true, 500]);
        const rec = play(withState(VLOT), days, { thresholdMs: null });
        assert.equal(rec.state, VLOT);
    });
});

describe('mastery: demotion', () => {
    for (const start of [UNTESTED, LEREN, VLOT, BEHEERST]) {
        test(`a wrong answer sends ${start} back to leren and resets the streak`, () => {
            const rec = play(withState(start, { streak: 2, slowStreak: 1 }), [[1, false]]);
            assert.equal(rec.state, LEREN);
            assert.equal(rec.streak, 0);
            assert.equal(rec.slowStreak, 0);
            assert.equal(rec.wrong, 1);
        });
    }

    test('a wrong answer on a re-queue repeat still demotes', () => {
        const rec = play(withState(VLOT), [[1, false, 1000, TYPED, { isRepeat: true }]]);
        assert.equal(rec.state, LEREN);
    });

    test('beheerst: one slow answer is noise, two in a row demote to vlot', () => {
        let rec = play(withState(BEHEERST), [[1, true, 4000]]);
        assert.equal(rec.state, BEHEERST);
        assert.equal(rec.slowStreak, 1);

        rec = play(rec, [[2, true, 4000]]);
        assert.equal(rec.state, VLOT);
        assert.equal(rec.streak, 0);
    });

    test('beheerst: a fast answer in between resets the slow count', () => {
        const rec = play(withState(BEHEERST), [[1, true, 4000], [2, true, 1000], [3, true, 4000]]);
        assert.equal(rec.state, BEHEERST);
        assert.equal(rec.slowStreak, 1);
    });
});

describe('mastery: logging', () => {
    test('correct latencies are logged per input mode, capped at 10', () => {
        const typed = Array.from({ length: 15 }, (_, i) => [1, true, 1000 + i, TYPED]);
        const mc = Array.from({ length: 3 }, () => [1, true, 700, MC]);
        const rec = play(undefined, [...typed, ...mc, [1, false, 9999, TYPED]]);
        assert.equal(rec.latencies[TYPED].length, 10);
        assert.equal(rec.latencies[TYPED].at(-1), 1014);
        assert.deepEqual(rec.latencies[MC], [700, 700, 700]);
        assert.equal(rec.correct, 18);
        assert.equal(rec.wrong, 1);
    });

    test('applyAnswer does not mutate the record it is given', () => {
        const before = withState(LEREN, { streak: 1 });
        const snapshot = structuredClone(before);
        play(before, [[2, true], [3, false]]);
        assert.deepEqual(before, snapshot);
    });
});

describe('mastery: siblings', () => {
    const promote = profile => recordAnswer(profile, '7x8',
        { correct: true, latencyMs: 1000, inputMode: TYPED, at: at(20) });

    test('reaching beheerst seeds an untested sibling at leren', () => {
        const { profile, to } = promote(calibratedProfile({ '7x8': withState(VLOT, { streak: 2 }) }));
        assert.equal(to, BEHEERST);
        assert.equal(profile.facts['8x7'].state, LEREN);
        assert.equal(profile.facts['8x7'].streak, 0);
    });

    test('a sibling already past untested is left alone', () => {
        const start = calibratedProfile({
            '7x8': withState(VLOT, { streak: 2 }),
            '8x7': withState(VLOT, { streak: 1 }),
        });
        const { profile } = promote(start);
        assert.deepEqual(profile.facts['8x7'], start.facts['8x7']);
    });

    test('squares have no sibling to seed', () => {
        const { profile, to } = recordAnswer(calibratedProfile({ '6x6': withState(VLOT, { streak: 2 }) }), '6x6',
            { correct: true, latencyMs: 1000, inputMode: TYPED, at: at(20) });
        assert.equal(to, BEHEERST);
        assert.deepEqual(Object.keys(profile.facts), ['6x6']);
    });

    test('recordAnswer does not mutate the profile it is given', () => {
        const start = calibratedProfile({ '7x8': withState(VLOT, { streak: 2 }) });
        const snapshot = structuredClone(start);
        promote(start);
        assert.deepEqual(start, snapshot);
    });
});

describe('mastery: thresholds', () => {
    const vlotWith = latency => withState(VLOT, { latencies: { [TYPED]: Array(10).fill(latency), [MC]: [] } });
    const threeFacts = latency => ({ '3x1': vlotWith(latency), '3x2': vlotWith(latency), '3x3': vlotWith(latency) });
    const run = (level, when) => ({ level, at: when, questions: 20, correct: 18, durationMs: 240000 });

    test('calibration lasts 7 session days, counted per input mode', () => {
        let profile = createProfile('Test', at(1));
        for (const d of [1, 2, 3, 4, 5, 6]) profile = recordSession(profile, run('reis', at(d)));
        profile = recordSession(profile, run('reis', at(6, 60))); // second run the same evening
        for (let d = 1; d <= 10; d++) profile = recordSession(profile, run('warp', at(d)));

        assert.equal(isCalibrating(profile, TYPED), true, 'Warp days do not end Reis calibration');
        assert.equal(activeThreshold(profile, TYPED), null);
        assert.equal(isCalibrating(profile, MC), false);

        profile = recordSession(profile, run('reis', at(7)));
        assert.equal(isCalibrating(profile, TYPED), false);
        assert.equal(activeThreshold(profile, TYPED), 5000, 'nothing computed yet: fallback');
    });

    test('fallback until 30 samples exist: typed 5000ms, MC 3500ms', () => {
        const facts = { '2x1': vlotWith(1000) };
        assert.deepEqual(computeThreshold(facts, TYPED), { ms: 5000, source: 'fallback', samples: 10 });
        assert.deepEqual(computeThreshold(facts, MC), { ms: 3500, source: 'fallback', samples: 0 });
    });

    test('only facts at vlot or above provide samples', () => {
        const facts = Object.fromEntries(
            [1, 2, 3, 4, 5].map(b => [`4x${b}`, withState(LEREN, { latencies: { [TYPED]: Array(10).fill(900), [MC]: [] } })]));
        assert.equal(computeThreshold(facts, TYPED).samples, 0);
    });

    test('threshold = clamp(1.5 × median, 2000, 6000)', () => {
        assert.equal(median([1, 2, 3, 4]), 2.5);
        assert.deepEqual(computeThreshold(threeFacts(2000), TYPED), { ms: 3000, source: 'calibrated', samples: 30 });
        assert.equal(computeThreshold(threeFacts(1000), TYPED).ms, 2000);
        assert.equal(computeThreshold(threeFacts(5000), TYPED).ms, 6000);
    });

    test('refresh: none while calibrating, then monthly; fallback retried; force recomputes', () => {
        const calibrating = refreshThreshold({ ...createProfile('New', at(1)), facts: threeFacts(2000) }, TYPED, at(2));
        assert.equal(calibrating.config.thresholds[TYPED], null);

        const p1 = refreshThreshold(calibratedProfile(threeFacts(2000)), TYPED, at(10), { force: true });
        assert.equal(p1.config.thresholds[TYPED].ms, 3000);

        const faster = { ...p1, facts: threeFacts(1600) };
        assert.equal(refreshThreshold(faster, TYPED, at(20)).config.thresholds[TYPED].ms, 3000, 'not due yet');
        assert.equal(refreshThreshold(faster, TYPED, at(10) + 30 * DAY_MS).config.thresholds[TYPED].ms, 2400);
        assert.equal(refreshThreshold(faster, TYPED, at(11), { force: true }).config.thresholds[TYPED].ms, 2400);

        const sparse = refreshThreshold(calibratedProfile({ '3x1': vlotWith(2000) }), TYPED, at(10), { force: true });
        assert.equal(sparse.config.thresholds[TYPED].source, 'fallback');
        const grown = refreshThreshold({ ...sparse, facts: threeFacts(2000) }, TYPED, at(11));
        assert.deepEqual([grown.config.thresholds[TYPED].source, grown.config.thresholds[TYPED].ms], ['calibrated', 3000]);
    });
});

describe('selector', () => {
    const now = at(20);

    test('weights: leren 5, untested 3, vlot 2, beheerst 1 only after a week unseen', () => {
        assert.equal(factWeight(undefined, now), 3);
        assert.equal(factWeight(withState(LEREN), now), 5);
        assert.equal(factWeight(withState(VLOT), now), 2);
        assert.equal(factWeight(withState(BEHEERST, { lastSeenAt: new Date(now - 3 * DAY_MS).toISOString() }), now), 0);
        assert.equal(factWeight(withState(BEHEERST, { lastSeenAt: new Date(now - 8 * DAY_MS).toISOString() }), now), 1);
    });

    test('weighted sampling follows 5 : 3 : 2 : 1, not uniform', () => {
        const rng = mulberry32(1);
        const items = [LEREN, UNTESTED, VLOT, BEHEERST];
        const weights = items.map(state => WEIGHTS[state]);
        const counts = Object.fromEntries(items.map(item => [item, 0]));
        const n = 110000;
        for (let i = 0; i < n; i++) counts[weightedPick(items, weights, rng)] += 1;
        for (const [i, item] of items.entries()) {
            assert.ok(Math.abs(counts[item] / n - weights[i] / 11) < 0.01, `${item}: ${counts[item] / n}`);
        }
    });

    test('never the same fact twice in a row, across the main and end phases', () => {
        const pool = unlockedFactIds({ unlockedTables: [10, 2] });
        const states = [UNTESTED, LEREN, VLOT];
        const records = Object.fromEntries(pool.map((id, i) => [id, withState(states[i % 3])]));
        const rng = mulberry32(7);
        const selector = createSelector({ pool, lookup: id => records[id], rng: mulberry32(8), now: () => now });

        const ids = [];
        for (let i = 0; i < 3000; i++) {
            const question = selector.next();
            ids.push(question.factId);
            selector.report(question, rng() > 0.3);
        }
        selector.finishMain();
        for (let question = selector.next(); question; question = selector.next()) ids.push(question.factId);

        for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1], `back-to-back at ${i}`);
    });

    test('a missed fact returns after exactly 2 intervening questions', () => {
        for (let seed = 1; seed <= 50; seed++) {
            const selector = createSelector({ pool: unlockedFactIds({ unlockedTables: [10] }), lookup: () => undefined, rng: mulberry32(seed) });
            const missed = selector.next();
            selector.report(missed, false);
            const between = [selector.next(), selector.next()];
            between.forEach(q => selector.report(q, true));
            const back = selector.next();

            assert.equal(back.factId, missed.factId);
            assert.equal(back.isRepeat, true);
            assert.ok(between.every(q => q.factId !== missed.factId && !q.isRepeat));
        }
    });

    test('every missed fact comes back once more at the end of the run', () => {
        const selector = createSelector({ pool: unlockedFactIds({ unlockedTables: [10, 5] }), lookup: () => undefined, rng: mulberry32(3) });
        const missed = new Set();
        for (let i = 0; i < 20; i++) {
            const question = selector.next();
            const correct = !(i === 0 || i === 5 || i === 11);
            if (!correct) missed.add(question.factId);
            selector.report(question, correct);
        }
        selector.finishMain();

        const endRepeats = [];
        for (let question = selector.next(); question; question = selector.next()) {
            if (question.isRepeat) endRepeats.push(question.factId);
            selector.report(question, false); // misses at the end do not queue again
        }
        assert.deepEqual(endRepeats.sort(), [...missed].sort());
    });

    test('re-queue repeats cannot promote, even when answered correctly', () => {
        const pool = ['7x1', '7x2', '7x3'];
        let profile = calibratedProfile(Object.fromEntries(pool.map(id => [id, withState(LEREN, { streak: 2 })])));
        const selector = createSelector({ pool, lookup: id => profile.facts[id], rng: mulberry32(5), now: () => at(12) });
        const answer = (question, correct, min) => {
            profile = recordAnswer(profile, question.factId,
                { correct, latencyMs: 1000, inputMode: TYPED, at: at(12, min), isRepeat: question.isRepeat }).profile;
            selector.report(question, correct);
        };

        const missed = selector.next();
        answer(missed, false, 0);
        answer(selector.next(), true, 1);
        answer(selector.next(), true, 2);
        const repeat = selector.next();
        assert.equal(repeat.factId, missed.factId);
        answer(repeat, true, 3);
        assert.deepEqual([profile.facts[missed.factId].state, profile.facts[missed.factId].streak], [LEREN, 0]);

        selector.finishMain();
        for (let question = selector.next(); question; question = selector.next()) answer(question, true, 4);
        assert.deepEqual([profile.facts[missed.factId].state, profile.facts[missed.factId].streak], [LEREN, 0]);
    });

    test('a single-fact pool still terminates', () => {
        const selector = createSelector({ pool: ['10x1'], lookup: () => undefined });
        const first = selector.next();
        selector.report(first, false);
        assert.equal(selector.next().factId, '10x1');
        selector.finishMain();
        assert.equal(selector.next().factId, '10x1');
        assert.equal(selector.next(), null);
    });
});

describe('clock', () => {
    test('latency runs from question rendered to first keypress, not to submit', () => {
        let t = 100;
        const clock = createLatencyClock(() => t);
        clock.start();
        t = 1300;
        assert.equal(clock.mark(), 1200);
        t = 5000;
        assert.equal(clock.mark(), 1200, 'later keypresses and submit do not move it');
        assert.equal(clock.latencyMs, 1200);
    });

    test('mark before start gives null; start begins a fresh measurement', () => {
        let t = 0;
        const clock = createLatencyClock(() => t);
        assert.equal(clock.mark(), null);
        clock.start();
        t = 800;
        clock.mark();
        clock.start();
        assert.equal(clock.latencyMs, null);
        t = 1000;
        assert.equal(clock.mark(), 200);
    });
});

describe('profile', () => {
    const run = { level: 'reis', at: at(3), questions: 20, correct: 18, durationMs: 240000 };

    test('a new profile: version 1, tafel van 10 only, no thresholds yet', () => {
        const profile = createProfile('Zoë', at(1));
        assert.equal(profile.version, 1);
        assert.deepEqual(profile.config.unlockedTables, [10]);
        assert.deepEqual(profile.config.thresholds, { typed: null, mc: null });
        assert.deepEqual(profile.facts, {});
    });

    test('names become slugs; empty names are refused', () => {
        assert.equal(slugify('Zoë de Vries'), 'zoe-de-vries');
        assert.throws(() => createProfile('   '), isProfileError('invalid-name'));
    });

    test('save and load round-trip under newton.profile.<slug>', () => {
        const storage = memoryStorage({ unrelated: 'x' });
        const store = createProfileStore(storage);
        const created = store.create('Zoë', at(1));
        assert.notEqual(storage.getItem(`${KEY_PREFIX}zoe`), null);
        assert.deepEqual(store.load('zoe'), created);
        assert.deepEqual(store.list().map(({ slug, name, ok }) => ({ slug, name, ok })), [{ slug: 'zoe', name: 'Zoë', ok: true }]);
    });

    test('creating a profile with a taken name fails instead of overwriting', () => {
        const store = createProfileStore(memoryStorage());
        store.create('Max', at(1));
        assert.throws(() => store.create('max', at(2)), isProfileError('exists'));
    });

    test('a missing profile fails visibly', () => {
        assert.throws(() => createProfileStore(memoryStorage()).load('nobody'), isProfileError('missing'));
    });

    test('a corrupt profile throws, stays listed, and is never reset', () => {
        const storage = memoryStorage({ [`${KEY_PREFIX}max`]: '{not json' });
        const store = createProfileStore(storage);
        assert.throws(() => store.load('max'), isProfileError('corrupt'));
        assert.equal(storage.getItem(`${KEY_PREFIX}max`), '{not json');
        assert.deepEqual(store.list().map(({ slug, ok }) => ({ slug, ok })), [{ slug: 'max', ok: false }]);
    });

    test('a structurally broken profile is rejected', () => {
        const profile = createProfile('Max', at(1));
        profile.facts['7x8'] = { ...newFactRecord(), state: 'bogus' };
        const store = createProfileStore(memoryStorage({ [`${KEY_PREFIX}max`]: JSON.stringify(profile) }));
        assert.throws(() => store.load('max'), isProfileError('corrupt'));
        assert.throws(() => store.save(profile), isProfileError('corrupt'));
    });

    test('a profile from a newer version is refused, not guessed at', () => {
        const future = { ...createProfile('Max', at(1)), version: 99 };
        assert.throws(() => importProfile(JSON.stringify(future)), isProfileError('newer-version'));
    });

    test('caps: 10 latencies per fact per mode, 60 sessions', () => {
        const profile = createProfile('Max', at(1));
        profile.facts['7x8'] = withState(LEREN, { latencies: { typed: Array.from({ length: 25 }, (_, i) => i), mc: [] } });
        for (let i = 0; i < 75; i++) profile.sessions.push({ date: '2026-10-01', mode: 'reis', questions: i, correct: 0, durationMs: 0 });

        const store = createProfileStore(memoryStorage());
        store.save(profile);
        const loaded = store.load('max');
        assert.deepEqual(loaded.facts['7x8'].latencies.typed, [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
        assert.equal(loaded.sessions.length, 60);
        assert.equal(loaded.sessions[0].questions, 15);
    });

    test('export / import round-trip; garbage is refused', () => {
        let profile = calibratedProfile({ '7x8': withState(VLOT, { streak: 2 }) });
        profile = recordAnswer(profile, '7x8', { correct: true, latencyMs: 1000, inputMode: TYPED, at: at(20) }).profile;
        profile = recordSession(profile, run);

        const json = exportProfile(profile);
        assert.deepEqual(importProfile(json), profile);
        assert.throws(() => importProfile('garbage'), isProfileError('corrupt'));

        const store = createProfileStore(memoryStorage());
        store.import(json);
        assert.throws(() => store.import(json), isProfileError('exists'));
        assert.equal(store.import(json, { overwrite: true }).name, 'Test');
    });

    test('recordSession logs the run by calendar day', () => {
        const profile = recordSession(createProfile('Max', at(1)), run);
        assert.deepEqual(profile.sessions, [{ date: '2026-10-03', mode: 'reis', questions: 20, correct: 18, durationMs: 240000 }]);
        assert.deepEqual(profile.config.calibrationDays, { typed: ['2026-10-03'], mc: [] });
        assert.throws(() => recordSession(profile, { ...run, level: 'arcade' }));
    });
});
