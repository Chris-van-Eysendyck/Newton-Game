/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 *
 * "Wie speelt er?" Shown when a child enters the maaltafels. Kids only pick;
 * profiles are created on the parent screen.
 */

import { openProfileStore } from '../storage.js';

const MAX_BUTTONS = 8;

export class ProfilePicker extends Phaser.Scene {

    constructor() {
        super('ProfilePicker');
    }

    preload() {
        if (!this.textures.exists('background')) {
            this.load.image('background', 'assets/space.png');
        }
    }

    /** @param {{ next?: string }} data  scene to fly to once a pilot is chosen */
    create(data) {
        const { width, height } = this.scale;
        this.next = data?.next ?? null;
        this.choices = [];

        this.background = this.add.tileSprite(width / 2, height / 2, width, height, 'background');

        this.title = this.add.text(width / 2, height * 0.15, 'WIE SPEELT ER?', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.addButton(width * 0.1, height * 0.9, 180, 60, '◀ TERUG', () => this.scene.start('Start'));

        let entries;
        try {
            entries = openProfileStore().list();
        } catch (error) {
            console.error('Profiles unavailable', error);
            this.message('Profielen kunnen op dit toestel\nniet geladen worden.');
            return;
        }

        if (entries.length === 0) {
            this.message('Nog geen piloten.\nVraag een ouder om er een te maken\nvia ⚙ op het startscherm.');
            return;
        }

        if (entries.length === 1 && entries[0].ok) {
            this.choose(entries[0]);
            return;
        }

        entries.slice(0, MAX_BUTTONS).forEach((entry, i) => {
            const alone = i === entries.length - 1 && i % 2 === 0;
            const x = alone ? width / 2 : (i % 2 === 0 ? width * 0.3 : width * 0.7);
            const y = height * 0.32 + Math.floor(i / 2) * 100;
            // A broken profile stays visible so the gap is noticed, but it cannot be played.
            const label = entry.ok ? entry.name : `${entry.slug} ⚠`;
            const onClick = entry.ok ? () => this.choose(entry) : null;
            this.choices.push(...this.addButton(x, y, 440, 80, label, onClick));
        });

        if (entries.some(entry => !entry.ok)) {
            this.choices.push(this.add.text(width / 2, height * 0.8, '⚠ = profiel beschadigd, bekijk het ouderscherm', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffaa44'
            }).setOrigin(0.5));
        }
    }

    update() {
        this.background.tilePositionX += 2;
    }

    choose(entry) {
        this.registry.set('activeProfile', entry.slug);

        if (this.next) {
            this.registry.set('targetLevel', this.next);
            this.scene.start('HyperJump');
            return;
        }

        // Nothing to fly to yet: De Reis hooks in here in step 3.
        this.choices.forEach(item => item.destroy());
        this.title.setText(`HALLO ${entry.name.toUpperCase()}!`);
        this.message('De maaltafels komen er binnenkort aan.');
    }

    message(text) {
        const { width, height } = this.scale;
        this.add.text(width / 2, height * 0.45, text, {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    /** Same look as the Start menu buttons. A null onClick draws a disabled button. */
    addButton(x, y, buttonWidth, buttonHeight, label, onClick) {
        const enabled = typeof onClick === 'function';
        const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, enabled ? 0x4444ff : 0x333333, 0.8);
        bg.setStrokeStyle(3, enabled ? 0xffffff : 0x666666);

        const text = this.add.text(x, y, label, {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: enabled ? '#ffffff' : '#888888',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        if (enabled) {
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerover', () => bg.setFillStyle(0x6666ff));
            bg.on('pointerout', () => bg.setFillStyle(0x4444ff));
            bg.on('pointerdown', onClick);
        }
        return [bg, text];
    }
}
