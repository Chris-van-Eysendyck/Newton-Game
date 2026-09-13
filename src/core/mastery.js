/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Mastery engine: per-fact state machine, promotion/demotion, latency thresholds.
 * Pure JS, no Phaser. See docs/maaltafels-handover.md §5.
 *
 * Settled with Chris on 13/09/2026:
 * - a session is a calendar day (local time)
 * - at most one promotion credit per fact per session, for every step
 * - calibration (the first 7 session days) is counted per input mode
 */

import { siblingId } from './facts.js';
import { INPUT_MODES } from './config.js';

export const STATES = Object.freeze({
    UNTESTED: 'untested',
    LEREN: 'leren',
    VLOT: 'vlot',
    BEHEERST: 'beheerst',
});

export const PROMOTION_STREAK = 3;
export const SLOW_DEMOTION_STREAK = 2;
export const LATENCY_CAP = 10;
export const CREDIT_CAP = 10;

export const CALIBRATION_DAYS = 7;
export const MIN_CALIBRATION_SAMPLES = 30;
export const FALLBACK_THRESHOLD_MS = Object.freeze({ [INPUT_MODES.TYPED]: 5000, [INPUT_MODES.MC]: 3500 });
export const THRESHOLD_FACTOR = 1.5;
export const THRESHOLD_MIN_MS = 2000;
export const THRESHOLD_MAX_MS = 6000;
export const RECALIBRATE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const MODES = Object.values(INPUT_MODES);

function assertMode(inputMode) {
    if (!MODES.includes(inputMode)) throw new Error(`Unknown input mode: ${inputMode}`);
}

function pushCapped(list, value, cap) {
    list.push(value);
    if (list.length > cap) list.splice(0, list.length - cap);
}

/** Local calendar day, e.g. "2026-11-04". One day is one session. */
export function dayKey(time) {
    const date = new Date(time);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export function newFactRecord() {
    return {
        state: STATES.UNTESTED,
        streak: 0,       // consecutive credited correct answers toward the next promotion
        slowStreak: 0,   // consecutive slow correct answers while beheerst
        correct: 0,
        wrong: 0,
        lastSeenAt: null,
        sessionsCredited: [],
        latencies: { [INPUT_MODES.TYPED]: [], [INPUT_MODES.MC]: [] },
    };
}

/**
 * Apply one answer to one fact record. Does not mutate `record`.
 *
 * @param {object|undefined} record  fact record; undefined means untested
 * @param {object} answer
 * @param {boolean} answer.correct
 * @param {number|null} answer.latencyMs  first keypress/tap after the question rendered
 * @param {'typed'|'mc'} answer.inputMode
 * @param {number|string|Date} answer.at  when the answer was given
 * @param {boolean} [answer.isRepeat]  miss re-queue repeat: correction, never evidence
 * @param {number|null} [answer.thresholdMs]  null while this mode is calibrating
 * @returns {{ record: object, from: string, to: string }}
 */
export function applyAnswer(record, answer) {
    const { correct, latencyMs = null, inputMode, isRepeat = false, thresholdMs = null } = answer;
    assertMode(inputMode);

    const rec = structuredClone(record ?? newFactRecord());
    const at = new Date(answer.at);
    const day = dayKey(at);
    const from = rec.state;

    // Only the first answer to a fact in a session can earn credit: a repeat inside
    // one session measures working memory, not retrieval. Promotion has to cross a night.
    const firstThisSession = rec.lastSeenAt === null || dayKey(rec.lastSeenAt) !== day;
    const earnsCredit = correct && !isRepeat && firstThisSession;
    const timed = thresholdMs !== null && latencyMs !== null;
    const fast = timed && latencyMs < thresholdMs;
    const slow = timed && latencyMs >= thresholdMs;

    rec.lastSeenAt = at.toISOString();

    if (!correct) {
        rec.wrong += 1;
        rec.state = STATES.LEREN;
        rec.streak = 0;
        rec.slowStreak = 0;
        return { record: rec, from, to: rec.state };
    }

    rec.correct += 1;
    if (latencyMs !== null) pushCapped(rec.latencies[inputMode], latencyMs, LATENCY_CAP);

    const credit = () => {
        rec.streak += 1;
        pushCapped(rec.sessionsCredited, day, CREDIT_CAP);
    };

    switch (from) {
        case STATES.UNTESTED:
            // The first correct answer enters leren; the streak toward vlot starts after it.
            rec.state = STATES.LEREN;
            break;

        case STATES.LEREN:
            // 3 consecutive credited correct answers, any speed, either mode.
            if (earnsCredit) {
                credit();
                if (rec.streak >= PROMOTION_STREAK) {
                    rec.state = STATES.VLOT;
                    rec.streak = 0;
                }
            }
            break;

        case STATES.VLOT:
            // 3 consecutive credited correct answers under threshold, typed only:
            // multiple choice can be passed by recognition, so it is practice, not proof.
            if (earnsCredit && inputMode === INPUT_MODES.TYPED) {
                if (fast) {
                    credit();
                    if (rec.streak >= PROMOTION_STREAK) {
                        rec.state = STATES.BEHEERST;
                        rec.streak = 0;
                    }
                } else {
                    rec.streak = 0; // slow, or no threshold yet because the mode is calibrating
                }
            }
            break;

        case STATES.BEHEERST:
            // One slow answer is noise (the cat walked past); two in a row demote.
            if (slow) {
                rec.slowStreak += 1;
                if (rec.slowStreak >= SLOW_DEMOTION_STREAK) {
                    rec.state = STATES.VLOT;
                    rec.streak = 0;
                    rec.slowStreak = 0;
                }
            } else if (fast) {
                rec.slowStreak = 0;
            }
            break;
    }

    return { record: rec, from, to: rec.state };
}

/**
 * Apply an answer to a profile: threshold lookup, the fact itself, sibling seeding.
 * Returns a new profile; the input is not mutated.
 */
export function recordAnswer(profile, factId, answer) {
    const thresholdMs = activeThreshold(profile, answer.inputMode);
    const { record, from, to } = applyAnswer(profile.facts[factId], { ...answer, thresholdMs });
    const facts = { ...profile.facts, [factId]: record };

    // The only transfer between commutative siblings: reaching beheerst seeds an
    // untested sibling at leren. Nothing else transfers.
    if (to === STATES.BEHEERST && from !== STATES.BEHEERST) {
        const sibling = siblingId(factId);
        const current = sibling ? facts[sibling] ?? newFactRecord() : null;
        if (current && current.state === STATES.UNTESTED) {
            facts[sibling] = { ...structuredClone(current), state: STATES.LEREN };
        }
    }

    return { profile: { ...profile, facts }, from, to, thresholdMs };
}

export function isCalibrating(profile, inputMode) {
    assertMode(inputMode);
    return profile.config.calibrationDays[inputMode].length < CALIBRATION_DAYS;
}

export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** clamp(1.5 × median(correct latencies on facts at vlot or above), 2000, 6000), per mode. */
export function computeThreshold(facts, inputMode) {
    assertMode(inputMode);
    const samples = Object.values(facts)
        .filter(record => record.state === STATES.VLOT || record.state === STATES.BEHEERST)
        .flatMap(record => record.latencies[inputMode]);

    if (samples.length < MIN_CALIBRATION_SAMPLES) {
        return { ms: FALLBACK_THRESHOLD_MS[inputMode], source: 'fallback', samples: samples.length };
    }
    const ms = Math.round(THRESHOLD_FACTOR * median(samples));
    return {
        ms: Math.min(THRESHOLD_MAX_MS, Math.max(THRESHOLD_MIN_MS, ms)),
        source: 'calibrated',
        samples: samples.length,
    };
}

/**
 * Recompute the stored threshold for a mode when it is due: never while calibrating,
 * monthly once calibrated, every time while still on the fallback. `force` is the
 * parent screen's recalibrate button. Returns a new profile.
 */
export function refreshThreshold(profile, inputMode, now, { force = false } = {}) {
    const current = profile.config.thresholds[inputMode];
    let next = null;

    if (!isCalibrating(profile, inputMode)) {
        const age = new Date(now).getTime() - new Date(current?.computedAt ?? 0).getTime();
        const due = !current || current.source === 'fallback' || age >= RECALIBRATE_AFTER_DAYS * DAY_MS;
        if (!force && !due) return profile;
        next = { ...computeThreshold(profile.facts, inputMode), computedAt: new Date(now).toISOString() };
    }

    return {
        ...profile,
        config: { ...profile.config, thresholds: { ...profile.config.thresholds, [inputMode]: next } },
    };
}

/** The threshold answers are judged against right now; null while calibrating. */
export function activeThreshold(profile, inputMode) {
    if (isCalibrating(profile, inputMode)) return null;
    return profile.config.thresholds[inputMode]?.ms ?? FALLBACK_THRESHOLD_MS[inputMode];
}
