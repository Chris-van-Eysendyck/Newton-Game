/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 *
 * Facts: ids, table generation, commutative siblings, question shapes.
 * Pure JS, no Phaser. See docs/maaltafels-handover.md §4.
 */

export const MULTIPLIERS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

export const SHAPES = Object.freeze({
    MULT: 'MULT',       // a × b = ?
    MISSING: 'MISSING', // a × ? = c   built, disabled until deeltafels
    DIV: 'DIV',         // c : a = ?   built, disabled until deeltafels
});

const ACTIVE_SHAPES = new Set([SHAPES.MULT]);

export function isShapeActive(shape) {
    return ACTIVE_SHAPES.has(shape);
}

/** a = the table (multiplicand), b = the multiplier. */
export function factId(a, b) {
    return `${a}x${b}`;
}

export function makeFact(a, b) {
    return { id: factId(a, b), a, b, product: a * b };
}

export function parseFactId(id) {
    const match = /^(\d+)x(\d+)$/.exec(id);
    if (!match) throw new Error(`Invalid fact id: ${id}`);
    return makeFact(Number(match[1]), Number(match[2]));
}

/** A planet's pool: a × 1 … a × 10. */
export function tableFacts(a) {
    return MULTIPLIERS.map(b => makeFact(a, b));
}

export function tableFactIds(a) {
    return MULTIPLIERS.map(b => factId(a, b));
}

/** 7x8 -> 8x7. Separate facts: a 7-year-old does not transfer between them. Squares have none. */
export function siblingId(id) {
    const { a, b } = parseFactId(id);
    return a === b ? null : factId(b, a);
}

export function makeQuestion(id, shape = SHAPES.MULT) {
    const { a, b, product } = parseFactId(id);
    switch (shape) {
        case SHAPES.MULT:
            return { factId: id, shape, text: `${a} × ${b} = ?`, answer: product };
        case SHAPES.MISSING:
            return { factId: id, shape, text: `${a} × ? = ${product}`, answer: b };
        case SHAPES.DIV:
            return { factId: id, shape, text: `${product} : ${a} = ?`, answer: b };
        default:
            throw new Error(`Unknown question shape: ${shape}`);
    }
}
