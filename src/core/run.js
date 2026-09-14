/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * One run of a maaltafel level: the question stream, answers applied to the profile,
 * the session logged at the end. Pure JS, no Phaser. See docs/maaltafels-handover.md §5, §6, §10.
 *
 * The scene only draws and collects input; every rule lives here, where node can test it.
 */

import { LEVELS, unlockedFactIds } from './config.js';
import { makeQuestion } from './facts.js';
import { recordAnswer, refreshThreshold } from './mastery.js';
import { recordSession } from './profile.js';
import { createSelector } from './selector.js';

export class RunError extends Error {
    /** @param {'no-tables'} code */
    constructor(code, message) {
        super(message);
        this.name = 'RunError';
        this.code = code;
    }
}

/**
 * @param {object} options
 * @param {object} options.profile  a validated profile
 * @param {'reis'|'warp'} options.levelId
 * @param {() => number} [options.now]  wall clock, epoch ms
 * @param {() => number} [options.rng]
 */
export function createRun({ profile, levelId, now = Date.now, rng = Math.random }) {
    const level = LEVELS[levelId];
    if (!level) throw new Error(`Unknown level: ${levelId}`);

    const startedAt = now();
    // Thresholds are recomputed when due (monthly, or while still on the fallback).
    let current = refreshThreshold(profile, level.inputMode, startedAt);

    const pool = unlockedFactIds(current.config);
    if (pool.length === 0) throw new RunError('no-tables', 'No tables are unlocked for this profile');

    const selector = createSelector({ pool, lookup: id => current.facts[id], rng, now });

    let question = null;
    let mainAsked = 0;
    let answered = 0;
    let correctCount = 0;
    let combo = 0;
    let bestCombo = 0;
    let finished = false;

    const legOver = () => (level.questions !== undefined && mainAsked >= level.questions)
        || (level.softStopMs !== undefined && now() - startedAt >= level.softStopMs);

    return {
        /** The next question, or null when the leg is done (main phase and end repeats). */
        next() {
            if (finished) throw new Error('Run is finished');
            if (question) throw new Error('Answer the current question first');
            if (selector.phase === 'main' && legOver()) selector.finishMain();

            const picked = selector.next();
            if (!picked) return null;
            if (picked.phase === 'main') mainAsked += 1;
            question = { ...picked, ...makeQuestion(picked.factId) };
            return question;
        },

        /**
         * @param {object} input
         * @param {number|string} input.value  what the child answered
         * @param {number|null} input.latencyMs  first keypress/tap after the question rendered
         */
        answer({ value, latencyMs = null }) {
            if (!question) throw new Error('No question to answer');
            const asked = question;
            question = null;

            const correct = Number(value) === asked.answer;
            const result = recordAnswer(current, asked.factId, {
                correct,
                latencyMs,
                inputMode: level.inputMode,
                at: now(),
                isRepeat: asked.isRepeat,
            });
            current = result.profile;
            selector.report(asked, correct);

            answered += 1;
            if (correct) {
                correctCount += 1;
                combo += 1;
                bestCombo = Math.max(bestCombo, combo);
            } else {
                combo = 0; // a miss costs the combo, never a life
            }
            return { correct, answer: asked.answer, question: asked, from: result.from, to: result.to, combo };
        },

        /**
         * Log the session (only if something was answered) and return the final profile.
         * Safe to call more than once; later calls change nothing.
         */
        finish() {
            if (!finished) {
                finished = true;
                question = null;
                if (answered > 0) {
                    const at = now();
                    current = recordSession(current, {
                        level: level.id, at, questions: answered, correct: correctCount, durationMs: at - startedAt,
                    });
                }
            }
            return current;
        },

        get profile() {
            return current;
        },

        get progress() {
            return {
                phase: selector.phase,
                mainAsked,
                legLength: level.questions ?? null,
                remainingEnd: selector.remainingEnd,
                answered,
                correct: correctCount,
                combo,
                bestCombo,
                finished,
            };
        },
    };
}
