/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Planets, levels, default profile config, unlock state.
 * Pure JS, no Phaser. See docs/maaltafels-handover.md §8–§10.
 */

import { tableFactIds } from './facts.js';

/** Thresholds are per input mode: typing on a numpad is structurally slower than tapping. */
export const INPUT_MODES = Object.freeze({
    TYPED: 'typed',
    MC: 'mc',
});

export const LEVELS = Object.freeze({
    // De Reis: typed answers, no clock, one leg of 20 questions. The only mode that earns beheerst.
    reis: Object.freeze({ id: 'reis', inputMode: INPUT_MODES.TYPED, questions: 20, softStopMs: 5 * 60 * 1000 }),
    // Warp: multiple choice against a 90 second session clock. Can earn vlot, never beheerst.
    warp: Object.freeze({ id: 'warp', inputMode: INPUT_MODES.MC, clockMs: 90 * 1000 }),
});

/** Map order: further from Earth = harder. The table for each planet is config, not code. */
export const PLANETS = Object.freeze([
    { id: 'maan', name: 'Maan', defaultTable: 10 },
    { id: 'mercurius', name: 'Mercurius', defaultTable: 2 },
    { id: 'venus', name: 'Venus', defaultTable: 5 },
    { id: 'mars', name: 'Mars', defaultTable: 4 },
    { id: 'asteroidengordel', name: 'Asteroïdengordel', defaultTable: 3 },
    { id: 'jupiter', name: 'Jupiter', defaultTable: 6 },
    { id: 'saturnus', name: 'Saturnus', defaultTable: 8 },
    { id: 'uranus', name: 'Uranus', defaultTable: 7 },
    { id: 'neptunus', name: 'Neptunus', defaultTable: 9 },
].map(Object.freeze));

/** The gauntlet: all tables mixed, unlocked after nine Admiraal badges. */
export const SUN = Object.freeze({ id: 'zon', name: 'De Zon' });

export function defaultConfig() {
    return {
        // Chris flips a table on when the teacher introduces it. Never by date, never automatically.
        unlockedTables: [10],
        tableForPlanet: Object.fromEntries(PLANETS.map(planet => [planet.id, planet.defaultTable])),
        // Per mode: null, or { ms, source: 'fallback' | 'calibrated', samples, computedAt }.
        thresholds: { [INPUT_MODES.TYPED]: null, [INPUT_MODES.MC]: null },
        // Distinct session days played per mode, up to the calibration length.
        calibrationDays: { [INPUT_MODES.TYPED]: [], [INPUT_MODES.MC]: [] },
    };
}

/** The selection pool: every fact of every unlocked table. */
export function unlockedFactIds(config) {
    return [...new Set(config.unlockedTables)]
        .sort((a, b) => a - b)
        .flatMap(tableFactIds);
}
