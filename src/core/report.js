/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Read-only summaries for the parent screen. Pure JS, no Phaser.
 * See docs/maaltafels-handover.md §9. The child never sees any of this (§3.7).
 */

import { MULTIPLIERS, factId } from './facts.js';
import { INPUT_MODES, PLANETS } from './config.js';
import { CALIBRATION_DAYS, FALLBACK_THRESHOLD_MS, STATES, isCalibrating, median } from './mastery.js';

const MODES = Object.values(INPUT_MODES);

const medianOrNull = values => (values.length ? median(values) : null);

/**
 * Tables 1–10 × multipliers 1–10. A fact never answered stays `untested` with no
 * numbers: never 0%, never green.
 */
export function factGrid(profile) {
    return MULTIPLIERS.map(a => ({
        table: a,
        facts: MULTIPLIERS.map(b => {
            const id = factId(a, b);
            const record = profile.facts[id];
            if (!record) {
                return {
                    id, state: STATES.UNTESTED, correct: 0, wrong: 0, lastSeenAt: null,
                    medianMs: Object.fromEntries(MODES.map(mode => [mode, null])),
                };
            }
            return {
                id,
                state: record.state,
                correct: record.correct,
                wrong: record.wrong,
                lastSeenAt: record.lastSeenAt,
                medianMs: Object.fromEntries(MODES.map(mode => [mode, medianOrNull(record.latencies[mode])])),
            };
        }),
    }));
}

/** Per planet: its configured table, whether that table is unlocked, and fact counts per state. */
export function planetProgress(profile) {
    const { tableForPlanet, unlockedTables } = profile.config;
    return PLANETS.map(planet => {
        const table = Number.isInteger(tableForPlanet[planet.id]) ? tableForPlanet[planet.id] : null;
        const records = table === null ? [] : MULTIPLIERS.map(b => profile.facts[factId(table, b)]);
        const counts = Object.fromEntries(Object.values(STATES).map(state => [state, 0]));
        for (const record of records) counts[record ? record.state : STATES.UNTESTED] += 1;
        return {
            planetId: planet.id,
            name: planet.name,
            table,
            unlocked: table !== null && unlockedTables.includes(table),
            counts,
            answeredCorrectly: records.filter(record => record && record.correct > 0).length,
            total: records.length,
        };
    });
}

/** What the parent screen shows for a mode's threshold. While calibrating there is no number. */
export function thresholdStatus(profile, inputMode) {
    const daysLogged = profile.config.calibrationDays[inputMode].length;
    const base = { inputMode, daysLogged, daysNeeded: CALIBRATION_DAYS };
    if (isCalibrating(profile, inputMode)) {
        return { ...base, calibrating: true, ms: null, source: null, samples: null, computedAt: null };
    }
    const stored = profile.config.thresholds[inputMode];
    return {
        ...base,
        calibrating: false,
        ms: stored?.ms ?? FALLBACK_THRESHOLD_MS[inputMode],
        source: stored?.source ?? 'fallback',
        samples: stored?.samples ?? null,
        computedAt: stored?.computedAt ?? null,
    };
}
