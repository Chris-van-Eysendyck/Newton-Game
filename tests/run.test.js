/**
 * Run controller tests: a whole leg of De Reis fed through the real selector and mastery engine.
 * Run with `npm test`.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { INPUT_MODES, LEVELS, setTableUnlocked } from '../src/core/config.js';
import { STATES, dayKey } from '../src/core/mastery.js';
import { createProfile, validateProfile } from '../src/core/profile.js';
import { RunError, createRun } from '../src/core/run.js';

const { TYPED } = INPUT_MODES;
const at = (d, min = 0) => new Date(2026, 9, d, 18, 30 + min).getTime();

function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A clock that advances `stepMs` every time it is read. */
function steppingClock(start, stepMs = 1000) {
    let t = start;
    return () => {
        const value = t;
        t += stepMs;
        return value;
    };
}

/** Play until next() returns null. `decide(question, i)` returns true for a correct answer. */
function playLeg(run, decide = () => true) {
    const asked = [];
    for (let q = run.next(); q; q = run.next()) {
        const correct = decide(q, asked.length);
        run.answer({ value: correct ? q.answer : q.answer + 1, latencyMs: 1500 });
        asked.push(q);
    }
    return asked;
}

const reis = (profile, options = {}) =>
    createRun({ profile, levelId: 'reis', now: steppingClock(at(1)), rng: mulberry32(7), ...options });

describe('run: De Reis leg', () => {
    test('an all-correct leg is exactly 20 questions, then null', () => {
        const run = reis(createProfile('Test', at(1)));
        const asked = playLeg(run);
        assert.equal(asked.length, LEVELS.reis.questions);
        assert.ok(asked.every(q => !q.isRepeat && q.phase === 'main'));
        assert.equal(run.progress.correct, 20);
        assert.equal(run.progress.bestCombo, 20);
    });

    test('questions come from unlocked tables only, as a × b = ?', () => {
        const profile = createProfile('Test', at(1));
        profile.config = setTableUnlocked(profile.config, 2, true);
        const asked = playLeg(reis(profile));
        for (const q of asked) {
            const [a, b] = q.factId.split('x').map(Number);
            assert.ok(a === 2 || a === 10, q.factId);
            assert.equal(q.text, `${a} × ${b} = ?`);
            assert.equal(q.answer, a * b);
        }
    });

    test('a miss returns after 2 questions and once more at the end; the repeats are flagged', () => {
        const run = reis(createProfile('Test', at(1)));
        const asked = playLeg(run, (q, i) => i !== 3);
        const missed = asked[3].factId;

        assert.equal(asked[6].factId, missed);
        assert.equal(asked[6].isRepeat, true);
        const last = asked[asked.length - 1];
        assert.equal(last.factId, missed);
        assert.equal(last.phase, 'end');
        assert.equal(last.isRepeat, true);
        assert.equal(asked.length, 21); // 20 in the leg (the in-leg repeat included) + 1 end repeat
    });

    test('a wrong answer resets the combo and demotes the fact, it never ends the run', () => {
        const run = reis(createProfile('Test', at(1)));
        const first = run.next();
        run.answer({ value: first.answer, latencyMs: 1200 });
        const second = run.next();
        const miss = run.answer({ value: second.answer + 1, latencyMs: 1200 });
        assert.equal(miss.correct, false);
        assert.equal(miss.answer, second.answer);
        assert.equal(miss.combo, 0);
        assert.equal(run.profile.facts[second.factId].state, STATES.LEREN);
        assert.ok(run.next(), 'the run carries on');
    });

    test('answers update the fact records with typed latencies', () => {
        const run = reis(createProfile('Test', at(1)));
        const q = run.next();
        const result = run.answer({ value: String(q.answer), latencyMs: 2345 });
        assert.equal(result.from, STATES.UNTESTED);
        assert.equal(result.to, STATES.LEREN);
        const record = run.profile.facts[q.factId];
        assert.deepEqual(record.latencies[TYPED], [2345]);
        assert.equal(record.correct, 1);
    });

    test('the soft stop ends the main phase after five minutes, end repeats still come', () => {
        const run = reis(createProfile('Test', at(1)), { now: steppingClock(at(1), 40 * 1000) });
        const asked = playLeg(run, (q, i) => i !== 0);
        const main = asked.filter(q => q.phase === 'main');
        assert.ok(main.length < LEVELS.reis.questions, `main phase ran ${main.length} questions`);
        assert.equal(asked[asked.length - 1].factId, asked[0].factId);
        assert.equal(asked[asked.length - 1].phase, 'end');
    });

    test('the run refuses to skip a question or answer twice', () => {
        const run = reis(createProfile('Test', at(1)));
        assert.throws(() => run.answer({ value: 1 }));
        const q = run.next();
        assert.throws(() => run.next());
        run.answer({ value: q.answer });
        assert.throws(() => run.answer({ value: q.answer }));
    });

    test('no unlocked tables is a visible RunError, not an empty run', () => {
        const profile = createProfile('Test', at(1));
        profile.config = setTableUnlocked(profile.config, 10, false);
        assert.throws(() => reis(profile), error => error instanceof RunError && error.code === 'no-tables');
    });

    test('the input profile is not mutated', () => {
        const profile = createProfile('Test', at(1));
        const before = structuredClone(profile);
        playLeg(reis(profile));
        assert.deepEqual(profile, before);
    });
});

describe('run: finish', () => {
    test('finish logs one session and a typed calibration day; the profile stays valid', () => {
        const run = reis(createProfile('Test', at(1)));
        playLeg(run, (q, i) => i % 5 !== 0);
        const profile = run.finish();

        assert.equal(profile.sessions.length, 1);
        const [session] = profile.sessions;
        assert.equal(session.date, dayKey(at(1)));
        assert.equal(session.mode, 'reis');
        assert.equal(session.questions, run.progress.answered);
        assert.equal(session.correct, run.progress.correct);
        assert.ok(session.durationMs > 0);
        assert.deepEqual(profile.config.calibrationDays.typed, [dayKey(at(1))]);
        assert.deepEqual(profile.config.calibrationDays.mc, []);
        validateProfile(profile);
    });

    test('finish is idempotent, and a run abandoned before any answer logs nothing', () => {
        const played = reis(createProfile('Test', at(1)));
        playLeg(played);
        assert.equal(played.finish(), played.finish());
        assert.equal(played.finish().sessions.length, 1);
        assert.throws(() => played.next());

        const abandoned = reis(createProfile('Test', at(1)));
        abandoned.next();
        const profile = abandoned.finish();
        assert.equal(profile.sessions.length, 0);
        assert.deepEqual(profile.config.calibrationDays.typed, []);
    });

    test('a second leg on the same evening earns no extra promotion credit', () => {
        const first = reis(createProfile('Test', at(1)));
        playLeg(first);
        const second = reis(first.finish(), { now: steppingClock(at(1, 30)) });
        playLeg(second);
        const profile = second.finish();
        for (const record of Object.values(profile.facts)) {
            assert.ok(record.sessionsCredited.length <= 1);
            assert.notEqual(record.state, STATES.VLOT);
        }
        assert.deepEqual(profile.config.calibrationDays.typed, [dayKey(at(1))]);
        assert.equal(profile.sessions.length, 2);
    });

    test('three evenings of correct legs move facts of the tafel van 10 to vlot, never to beheerst', () => {
        let profile = createProfile('Test', at(1));
        for (const day of [1, 2, 3, 4]) {
            const run = reis(profile, { now: steppingClock(at(day)), rng: mulberry32(day) });
            playLeg(run);
            profile = run.finish();
        }
        const states = Object.values(profile.facts).map(record => record.state);
        assert.ok(states.includes(STATES.VLOT), `states: ${states.join(', ')}`);
        assert.ok(!states.includes(STATES.BEHEERST), 'still calibrating: nothing reaches beheerst');
    });
});
