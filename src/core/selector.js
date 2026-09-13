/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Selection engine: weighted sampling, no back-to-back repeats, miss re-queue.
 * Pure JS, no Phaser. See docs/maaltafels-handover.md §6.
 *
 * Never uniform: the hard dozen (6×7, 7×8, 8×9, …) must come round far more often
 * than 2×3, or they never stick.
 */

import { STATES } from './mastery.js';

export const WEIGHTS = Object.freeze({
    [STATES.LEREN]: 5,
    [STATES.UNTESTED]: 3,
    [STATES.VLOT]: 2,
    [STATES.BEHEERST]: 1,
});

export const MAINTENANCE_AFTER_DAYS = 7;
export const REQUEUE_GAP = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export function factWeight(record, now) {
    if (!record) return WEIGHTS[STATES.UNTESTED];
    if (record.state === STATES.BEHEERST) {
        // Maintenance, not drilling: only once it has gone unseen for a week.
        const lastSeen = record.lastSeenAt ? Date.parse(record.lastSeenAt) : -Infinity;
        return now - lastSeen >= MAINTENANCE_AFTER_DAYS * DAY_MS ? WEIGHTS[STATES.BEHEERST] : 0;
    }
    return WEIGHTS[record.state];
}

export function weightedPick(items, weights, rng) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!(total > 0)) return null;
    let roll = rng() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll < 0) return items[i];
    }
    for (let i = items.length - 1; i >= 0; i--) {
        if (weights[i] > 0) return items[i]; // floating-point edge
    }
    return null;
}

/**
 * The question stream for one run.
 *
 * Main phase: weighted sampling. A missed fact returns after exactly REQUEUE_GAP
 * intervening questions. After finishMain(), every fact missed in the run comes back
 * once more, then next() returns null. Repeats are flagged `isRepeat` so the mastery
 * engine never counts them as evidence.
 *
 * @param {object} options
 * @param {string[]} options.pool  unlocked, active fact ids
 * @param {(factId: string) => object|undefined} options.lookup  current fact record
 * @param {() => number} [options.rng]
 * @param {() => number} [options.now]
 */
export function createSelector({ pool, lookup, rng = Math.random, now = Date.now }) {
    const facts = [...new Set(pool)];
    if (facts.length === 0) throw new Error('Selector needs a non-empty pool');

    const due = new Map();   // question index -> fact id re-asked at that index
    const endQueue = [];     // missed fact ids, each re-asked once at the end
    let index = 0;
    let last = null;
    let phase = 'main';

    // Try each exclusion list in turn; tiny pools relax the rules rather than stall.
    const sample = (...exclusions) => {
        const t = now();
        for (const exclude of [...exclusions, []]) {
            const candidates = facts.filter(id => !exclude.includes(id));
            if (candidates.length === 0) continue;
            let weights = candidates.map(id => factWeight(lookup(id), t));
            if (weights.every(weight => weight === 0)) {
                weights = candidates.map(() => 1); // all mastered and seen this week: plain maintenance
            }
            return weightedPick(candidates, weights, rng);
        }
        return facts[0];
    };

    const emit = (factId, isRepeat) => {
        const question = { factId, isRepeat, index, phase };
        index += 1;
        last = factId;
        return question;
    };

    return {
        next() {
            if (phase === 'main') {
                if (due.has(index)) {
                    const factId = due.get(index);
                    due.delete(index);
                    return emit(factId, true);
                }
                // Never the same fact twice in a row, and never the fact due right after this one.
                return emit(sample([last, due.get(index + 1)], [last]), false);
            }

            if (endQueue.length === 0) return null;
            const pick = endQueue.findIndex(id => id !== last);
            if (pick === -1 && facts.length > 1) {
                return emit(sample([last]), false); // only the fact just shown is left: one filler first
            }
            return emit(endQueue.splice(Math.max(pick, 0), 1)[0], true);
        },

        report(question, correct) {
            if (correct || question.phase !== 'main') return;
            due.set(question.index + REQUEUE_GAP + 1, question.factId);
            if (!endQueue.includes(question.factId)) endQueue.push(question.factId);
        },

        /** End of the leg / clock: switch to the end-of-run repeats. */
        finishMain() {
            phase = 'end';
            due.clear();
        },

        get phase() {
            return phase;
        },

        get remainingEnd() {
            return endQueue.length;
        },
    };
}
