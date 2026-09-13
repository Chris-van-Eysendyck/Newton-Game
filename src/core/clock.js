/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Latency measurement. Pure JS, no Phaser. See docs/maaltafels-handover.md §5.
 *
 * The clock starts when the question is fully rendered and stops on the first
 * keypress or tap, not on submit: stopping at submit measures thumbs, not recall.
 */

const defaultNow = () => globalThis.performance.now();

export function createLatencyClock(now = defaultNow) {
    let startedAt = null;
    let latencyMs = null;

    return {
        /** Call once the question is fully on screen. */
        start() {
            startedAt = now();
            latencyMs = null;
        },

        /** Call on every keypress/tap; only the first one after start() counts. */
        mark() {
            if (startedAt !== null && latencyMs === null) {
                latencyMs = Math.round(now() - startedAt);
            }
            return latencyMs;
        },

        reset() {
            startedAt = null;
            latencyMs = null;
        },

        get latencyMs() {
            return latencyMs;
        },
    };
}
