/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * The browser side of profile storage. src/core/ stays free of browser APIs.
 */

import { createProfileStore } from './core/profile.js';

/** Throws when this browser blocks localStorage (private mode, blocked site data). */
export function openProfileStore() {
    return createProfileStore(window.localStorage);
}
