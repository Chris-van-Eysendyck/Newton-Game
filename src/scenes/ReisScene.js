/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 *
 * De Reis: typed answers on the numpad, no clock, one leg of 20 questions, then dock.
 * The only level that can earn beheerst. See docs/maaltafels-handover.md §10.
 */

import { BaseMathScene, PANEL } from './BaseMathScene.js';
import { createNumpad } from './ui/Numpad.js';

const MAX_DIGITS = 3;  // 10 × 10 = 100

export class ReisScene extends BaseMathScene {

    constructor() {
        super('ReisScene', {
            levelId: 'reis',
            title: 'DE REIS',
            intro: 'Typ het antwoord op elke som.\nNa 20 sommen meren we aan.'
        });
    }

    createInput() {
        this.entry = '';
        this.entryText = this.add.text(PANEL.x, PANEL.y + 55, '', {
            fontSize: '72px',
            fontFamily: 'Arial',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        this.numpad = createNumpad(this, {
            x: 1030,
            y: 190,
            onDigit: digit => this.typeDigit(digit),
            onDelete: () => this.deleteDigit(),
            onSubmit: () => this.submitEntry()
        });
        this.numpad.setVisible(false);
    }

    onQuestion() {
        this.entry = '';
        this.showEntry();
        this.entryText.setColor('#ffff00').setVisible(true);
        this.numpad.setVisible(true);
        this.numpad.setEnabled(true);
    }

    onKey(event) {
        if (/^[0-9]$/.test(event.key)) this.typeDigit(Number(event.key));
        else if (event.key === 'Backspace' || event.key === 'Delete') this.deleteDigit();
        else if (event.key === 'Enter') this.submitEntry();
    }

    onAnswered(result) {
        this.numpad.setEnabled(false);
        this.entryText.setColor(result.correct ? '#00ff00' : '#ff6666');
        if (!result.correct) this.entryText.setText(`jij: ${this.entry}`).setFontSize(40);
    }

    onDock() {
        this.numpad.setVisible(false);
        this.entryText.setVisible(false);
    }

    typeDigit(digit) {
        if (!this.question || this.entry.length >= MAX_DIGITS) return;
        // The latency clock stops here, on the first key, not on OK.
        this.markInput();
        this.entry = this.entry === '0' ? String(digit) : this.entry + digit;
        this.showEntry();
        this.tweens.add({ targets: this.entryText, scale: 1.15, duration: 80, yoyo: true });
    }

    deleteDigit() {
        if (!this.question || this.entry === '') return;
        this.entry = this.entry.slice(0, -1);
        this.showEntry();
    }

    submitEntry() {
        if (!this.question || this.entry === '') return;
        this.submit(Number(this.entry));
    }

    showEntry() {
        this.entryText.setFontSize(72).setText(this.entry === '' ? '_' : this.entry);
    }
}
