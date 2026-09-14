/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 *
 * On-screen numpad: 1–9 in a phone layout, then ⌫ 0 OK. Big buttons, because on a phone
 * the 1280×720 canvas is scaled down a long way.
 */

const LAYOUT = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['del', '0', 'ok'],
];

const STYLES = {
    digit: { fill: 0x4444ff, hover: 0x6666ff },
    del: { fill: 0xcc3333, hover: 0xee5555, label: '⌫' },
    ok: { fill: 0x33aa33, hover: 0x55cc55, label: 'OK' },
};

/**
 * @param {Phaser.Scene} scene
 * @param {object} options
 * @param {number} options.x  centre of the middle column
 * @param {number} options.y  centre of the top row
 * @param {(digit: number) => void} options.onDigit
 * @param {() => void} options.onDelete
 * @param {() => void} options.onSubmit
 */
export function createNumpad(scene, { x, y, size = 105, gap = 15, onDigit, onDelete, onSubmit }) {
    const items = [];
    let enabled = true;

    LAYOUT.forEach((row, r) => row.forEach((key, c) => {
        const style = STYLES[key] ?? STYLES.digit;
        const bx = x + (c - 1) * (size + gap);
        const by = y + r * (size + gap);

        const bg = scene.add.rectangle(bx, by, size, size, style.fill, 0.85).setStrokeStyle(3, 0xffffff);
        const text = scene.add.text(bx, by, style.label ?? key, {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => enabled && bg.setFillStyle(style.hover, 0.85));
        bg.on('pointerout', () => bg.setFillStyle(style.fill, 0.85));
        bg.on('pointerdown', () => {
            if (!enabled) return;
            scene.tweens.add({ targets: [bg, text], scale: 0.9, duration: 80, yoyo: true });
            if (key === 'ok') onSubmit();
            else if (key === 'del') onDelete();
            else onDigit(Number(key));
        });

        items.push(bg, text);
    }));

    return {
        setEnabled(value) {
            enabled = value;
            items.forEach(item => item.setAlpha(value ? 1 : 0.6));
        },
        setVisible(value) {
            items.forEach(item => item.setVisible(value));
        },
        destroy() {
            items.forEach(item => item.destroy());
            items.length = 0;
        },
    };
}
