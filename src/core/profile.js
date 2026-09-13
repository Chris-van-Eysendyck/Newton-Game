/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Profiles: create, load/save through a localStorage-like store, migrate, export/import.
 * Pure JS, no Phaser. See docs/maaltafels-handover.md §7.
 *
 * A missing or corrupt profile fails visibly (ProfileError). It is never silently
 * reset to zeros: a data gap must not render as a clean report.
 */

import { INPUT_MODES, LEVELS, defaultConfig } from './config.js';
import { STATES, LATENCY_CAP, CREDIT_CAP, CALIBRATION_DAYS, dayKey } from './mastery.js';

export const PROFILE_VERSION = 1;
export const KEY_PREFIX = 'newton.profile.';
export const SESSIONS_CAP = 60;

const MODES = Object.values(INPUT_MODES);
const STATE_VALUES = Object.values(STATES);

// version n -> function turning a version n profile into version n + 1.
const MIGRATIONS = {};

export class ProfileError extends Error {
    /** @param {'missing'|'corrupt'|'newer-version'|'no-migration'|'exists'|'invalid-name'} code */
    constructor(code, message, { slug = null, cause } = {}) {
        super(message, { cause });
        this.name = 'ProfileError';
        this.code = code;
        this.slug = slug;
    }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = value => Number.isInteger(value) && value >= 0;

export function slugify(name) {
    return String(name ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function createProfile(name, now = Date.now()) {
    const trimmed = String(name ?? '').trim();
    if (!slugify(trimmed)) throw new ProfileError('invalid-name', `Invalid profile name: "${name}"`);
    return {
        version: PROFILE_VERSION,
        name: trimmed,
        createdAt: new Date(now).toISOString(),
        facts: {},
        planets: {},
        sessions: [],
        config: defaultConfig(),
    };
}

export function migrateProfile(raw) {
    if (!isObject(raw) || !Number.isInteger(raw.version)) {
        throw new ProfileError('corrupt', 'Profile has no valid version field');
    }
    if (raw.version > PROFILE_VERSION) {
        throw new ProfileError('newer-version',
            `Profile is version ${raw.version}; this game understands up to ${PROFILE_VERSION}`);
    }
    let profile = raw;
    while (profile.version < PROFILE_VERSION) {
        const step = MIGRATIONS[profile.version];
        if (!step) throw new ProfileError('no-migration', `No migration from version ${profile.version}`);
        profile = step(profile);
    }
    return profile;
}

export function validateProfile(profile) {
    if (!isObject(profile)) throw new ProfileError('corrupt', 'Profile is not an object');
    const problems = [];
    const check = (ok, what) => {
        if (!ok) problems.push(what);
    };

    check(profile.version === PROFILE_VERSION, 'version');
    check(typeof profile.name === 'string' && slugify(profile.name) !== '', 'name');
    check(typeof profile.createdAt === 'string' && !Number.isNaN(Date.parse(profile.createdAt)), 'createdAt');
    check(isObject(profile.facts), 'facts');

    for (const [id, record] of Object.entries(isObject(profile.facts) ? profile.facts : {})) {
        const where = `facts.${id}`;
        check(/^\d+x\d+$/.test(id), `${where} id`);
        if (!isObject(record)) {
            problems.push(where);
            continue;
        }
        check(STATE_VALUES.includes(record.state), `${where}.state`);
        check([record.streak, record.slowStreak, record.correct, record.wrong].every(isCount), `${where} counters`);
        check(record.lastSeenAt === null || typeof record.lastSeenAt === 'string', `${where}.lastSeenAt`);
        check(Array.isArray(record.sessionsCredited), `${where}.sessionsCredited`);
        check(isObject(record.latencies) && MODES.every(mode => Array.isArray(record.latencies[mode])),
            `${where}.latencies`);
    }

    check(isObject(profile.planets), 'planets');
    check(Array.isArray(profile.sessions), 'sessions');

    const config = profile.config;
    if (!isObject(config)) {
        problems.push('config');
    } else {
        check(Array.isArray(config.unlockedTables)
            && config.unlockedTables.every(table => Number.isInteger(table) && table >= 1 && table <= 10),
        'config.unlockedTables');
        check(isObject(config.tableForPlanet), 'config.tableForPlanet');
        check(isObject(config.thresholds) && MODES.every(mode => config.thresholds[mode] === null
            || (isObject(config.thresholds[mode]) && typeof config.thresholds[mode].ms === 'number')),
        'config.thresholds');
        check(isObject(config.calibrationDays) && MODES.every(mode => Array.isArray(config.calibrationDays[mode])),
            'config.calibrationDays');
    }

    if (problems.length) {
        throw new ProfileError('corrupt', `Profile failed validation: ${problems.join(', ')}`);
    }
    return profile;
}

/** Keep storage small and bounded: 10 latencies per fact per mode, 60 sessions. */
export function capProfile(profile) {
    const facts = Object.fromEntries(Object.entries(profile.facts).map(([id, record]) => [id, {
        ...record,
        sessionsCredited: record.sessionsCredited.slice(-CREDIT_CAP),
        latencies: Object.fromEntries(MODES.map(mode => [mode, record.latencies[mode].slice(-LATENCY_CAP)])),
    }]));
    return { ...profile, facts, sessions: profile.sessions.slice(-SESSIONS_CAP) };
}

export function parseProfile(json) {
    let raw;
    try {
        raw = JSON.parse(json);
    } catch (cause) {
        throw new ProfileError('corrupt', 'Profile is not valid JSON', { cause });
    }
    return validateProfile(migrateProfile(raw));
}

/** The parent screen's escape hatch for moving devices: a JSON string in a textarea. */
export function exportProfile(profile) {
    return JSON.stringify(capProfile(validateProfile(profile)), null, 2);
}

export function importProfile(json) {
    return capProfile(parseProfile(json));
}

/** Log a finished run. The first run of a day in a mode also counts as a calibration day. */
export function recordSession(profile, { level, at, questions, correct, durationMs }) {
    const levelConfig = LEVELS[level];
    if (!levelConfig) throw new Error(`Unknown level: ${level}`);

    const date = dayKey(at);
    const sessions = [...profile.sessions, { date, mode: level, questions, correct, durationMs }]
        .slice(-SESSIONS_CAP);

    const mode = levelConfig.inputMode;
    const days = profile.config.calibrationDays[mode];
    const calibrationDays = days.length < CALIBRATION_DAYS && !days.includes(date) ? [...days, date] : days;

    return {
        ...profile,
        sessions,
        config: {
            ...profile.config,
            calibrationDays: { ...profile.config.calibrationDays, [mode]: calibrationDays },
        },
    };
}

/**
 * Profiles in a localStorage-like store, one key per profile: newton.profile.<slug>.
 * @param {{ length: number, key(i: number): string|null, getItem(k: string): string|null,
 *           setItem(k: string, v: string): void, removeItem(k: string): void }} storage
 */
export function createProfileStore(storage) {
    const keyFor = slug => KEY_PREFIX + slug;

    const load = slug => {
        const raw = storage.getItem(keyFor(slug));
        if (raw === null) throw new ProfileError('missing', `No profile "${slug}"`, { slug });
        try {
            return parseProfile(raw);
        } catch (error) {
            if (error instanceof ProfileError) error.slug = slug;
            throw error;
        }
    };

    const save = profile => {
        const clean = capProfile(validateProfile(profile));
        storage.setItem(keyFor(slugify(clean.name)), JSON.stringify(clean));
        return clean;
    };

    const assertFree = profile => {
        const slug = slugify(profile.name);
        if (storage.getItem(keyFor(slug)) !== null) {
            throw new ProfileError('exists', `A profile "${slug}" already exists`, { slug });
        }
    };

    return {
        /** Every stored profile, including broken ones (ok: false), so the picker can show them. */
        list() {
            const entries = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (!key || !key.startsWith(KEY_PREFIX)) continue;
                const slug = key.slice(KEY_PREFIX.length);
                try {
                    entries.push({ slug, name: load(slug).name, ok: true });
                } catch (error) {
                    entries.push({ slug, name: null, ok: false, error });
                }
            }
            return entries.sort((a, b) => a.slug.localeCompare(b.slug));
        },

        load,
        save,

        create(name, now = Date.now()) {
            const profile = createProfile(name, now);
            assertFree(profile);
            return save(profile);
        },

        import(json, { overwrite = false } = {}) {
            const profile = importProfile(json);
            if (!overwrite) assertFree(profile);
            return save(profile);
        },

        remove(slug) {
            storage.removeItem(keyFor(slug));
        },
    };
}
