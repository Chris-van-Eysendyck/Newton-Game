/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 *
 * Shared base for the maaltafel levels: ship, target, HUD, effects, question lifecycle,
 * saving, docking. A level only adds its input. See docs/maaltafels-handover.md §3, §10.
 *
 * The rules (what to ask, what counts, what gets saved) live in src/core/run.js.
 * The ship flies itself and a wrong answer never ends the run or damages anything.
 */

import { openProfileStore } from '../storage.js';
import { createLatencyClock } from '../core/clock.js';
import { ProfileError } from '../core/profile.js';
import { RunError, createRun } from '../core/run.js';

const WIDTH = 1280;
const HEIGHT = 720;
const SHIP = { x: 170, y: 480 };
const TARGET = { x: 560, y: 480 };
export const PANEL = { x: 380, y: 215, width: 600, height: 240 };

const PRAISE = ['SUPER!', 'TOP!', 'GOED ZO!', 'KNAP!', 'RAAK!', 'YES!'];
const PAUSE_AFTER_HIT_MS = 1000;
const PAUSE_AFTER_MISS_MS = 2200;  // long enough to read the whole fact

const PROBLEMS = {
    storage: 'Voortgang kan in deze browser\nniet bewaard worden.',
    profile: 'Dit profiel kan niet geladen worden.\nVraag een ouder om te kijken\nvia ⚙ op het startscherm.',
    'no-tables': 'Er zijn nog geen tafels vrijgegeven.\nVraag een ouder om er een aan te zetten\nvia ⚙ op het startscherm.',
    unknown: 'Er ging iets mis bij het starten.',
};

export class BaseMathScene extends Phaser.Scene {

    /**
     * @param {string} key  scene key
     * @param {{ levelId: 'reis'|'warp', title: string, intro: string }} level
     */
    constructor(key, level) {
        super(key);
        this.level = level;
    }

    preload() {
        if (!this.textures.exists('background')) this.load.image('background', 'assets/space.png');
        if (!this.textures.exists('ship')) {
            this.load.spritesheet('ship', 'assets/spaceship.png', { frameWidth: 176, frameHeight: 96 });
        }
        if (!this.textures.exists('asteroid')) this.load.image('asteroid', 'assets/Asteroid2.png');
    }

    create() {
        this.phase = 'loading';  // loading → intro → play → dock → done, or problem
        this.clock = createLatencyClock();
        this.run = null;
        this.store = null;
        this.question = null;
        this.target = null;
        this.saveWarning = null;

        this.background = this.add.tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 'background');
        if (!this.anims.exists('fly')) {
            this.anims.create({
                key: 'fly',
                frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: -1
            });
        }
        this.ship = this.add.sprite(SHIP.x, SHIP.y, 'ship').play('fly');
        this.shield = this.add.circle(SHIP.x, SHIP.y, 85).setStrokeStyle(5, 0x66ccff).setAlpha(0);

        this.addButton(90, 45, 150, 54, '◀ STOP', () => this.scene.start('Start'), 26);
        this.input.keyboard.on('keydown', this.handleKey, this);

        // Leaving mid-run still logs the session; closing the tab too.
        this.onPageHide = () => this.finishAndSave();
        this.onPageShow = event => event.persisted && this.scene.start('Start');
        window.addEventListener('pagehide', this.onPageHide);
        window.addEventListener('pageshow', this.onPageShow);
        this.events.once('shutdown', this.cleanUp, this);

        try {
            this.store = openProfileStore();
        } catch (error) {
            this.showProblem(PROBLEMS.storage, error);
            return;
        }

        let profile;
        try {
            profile = this.store.load(this.registry.get('activeProfile'));
            this.run = createRun({ profile, levelId: this.level.levelId });
        } catch (error) {
            const text = error instanceof RunError ? PROBLEMS[error.code]
                : error instanceof ProfileError ? PROBLEMS.profile
                    : PROBLEMS.unknown;
            this.showProblem(text, error);
            return;
        }

        this.pilotName = profile.name;
        this.buildPlayfield();
        this.createInput();
        this.showIntro();
    }

    update() {
        this.background.tilePositionX += 2;
        if (this.target?.active) {
            this.target.angle += 0.2;
            this.target.y = TARGET.y + Math.sin(this.time.now / 700) * 8;
        }
    }

    // ------------------------------------------------------------------
    // Hooks for the level
    // ------------------------------------------------------------------

    /** Build the input controls, hidden until the first question. */
    createInput() {}

    /** A new question is on screen: reset and enable the input. */
    onQuestion(question) {}

    /** A key went down while playing. */
    onKey(event) {}

    /** The answer was judged; the base shows the feedback. */
    onAnswered(result) {}

    /** The leg is over: hide the input. */
    onDock() {}

    // ------------------------------------------------------------------
    // Question lifecycle
    // ------------------------------------------------------------------

    buildPlayfield() {
        this.panel = this.add.graphics();
        this.panel.fillStyle(0x000022, 0.75);
        this.panel.fillRoundedRect(PANEL.x - PANEL.width / 2, PANEL.y - PANEL.height / 2, PANEL.width, PANEL.height, 24);
        this.panel.lineStyle(3, 0xffffff, 0.6);
        this.panel.strokeRoundedRect(PANEL.x - PANEL.width / 2, PANEL.y - PANEL.height / 2, PANEL.width, PANEL.height, 24);

        this.questionText = this.add.text(PANEL.x, PANEL.y - 45, '', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.feedbackText = this.add.text(PANEL.x, PANEL.y + PANEL.height / 2 + 45, '', {
            fontSize: '44px',
            fontFamily: 'Arial',
            color: '#6fdd86',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // The leg as a flight from here to the dock. Distance, never a mastery count.
        this.progressTrack = this.add.rectangle(640, 45, 560, 8, 0xffffff, 0.25);
        this.progressDock = this.add.circle(920, 45, 12).setStrokeStyle(4, 0x66ccff);
        this.progressShip = this.add.sprite(360, 45, 'ship').setScale(0.3);

        this.comboText = this.add.text(1240, 45, '', {
            fontSize: '34px',
            fontFamily: 'Arial',
            color: '#ffdd44',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(1, 0.5);

        this.playfield = [this.panel, this.questionText, this.feedbackText];
        this.playfield.forEach(item => item.setVisible(false));
    }

    showIntro() {
        this.phase = 'intro';
        const title = this.add.text(640, 170, this.level.title, {
            fontSize: '72px',
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const hello = this.add.text(640, 260, `Hallo ${this.pilotName}!`, {
            fontSize: '44px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const intro = this.add.text(640, 370, this.level.intro, {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#ffff66',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        const button = this.addButton(640, 560, 300, 90, 'START ▶', () => this.begin(), 40, 0x33aa33, 0x55cc55);
        this.introItems = [title, hello, intro, ...button];
    }

    begin() {
        if (this.phase !== 'intro') return;
        this.introItems.forEach(item => item.destroy());
        this.phase = 'play';
        this.playfield.forEach(item => item.setVisible(true));
        this.spawnTarget();
        this.askNext();
    }

    askNext() {
        if (this.phase !== 'play') return;
        const question = this.run.next();
        if (!question) {
            this.dock();
            return;
        }
        this.question = question;
        this.clock.reset();
        this.feedbackText.setText('');
        this.questionText.setText(question.text).setColor('#ffffff');
        this.updateHud();
        this.onQuestion(question);

        // The clock starts once the question is actually drawn, not when it is chosen.
        this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
            if (this.question === question) this.clock.start();
        });
    }

    /** The level calls this on the first keypress or tap of an answer. */
    markInput() {
        this.clock.mark();
    }

    /** The level calls this with the child's answer. */
    submit(value) {
        if (this.phase !== 'play' || !this.question) return;
        this.clock.mark();
        const result = this.run.answer({ value, latencyMs: this.clock.latencyMs });
        this.question = null;
        this.save(this.run.profile);

        this.onAnswered(result);
        if (result.correct) this.hit(result);
        else this.miss(result);
        this.updateHud();

        this.time.delayedCall(result.correct ? PAUSE_AFTER_HIT_MS : PAUSE_AFTER_MISS_MS, () => this.askNext());
    }

    updateHud() {
        const { phase, mainAsked, legLength, combo } = this.run.progress;
        const done = phase === 'end' || this.phase !== 'play' || !legLength
            ? 1
            : Math.max(0, mainAsked - (this.question ? 1 : 0)) / legLength;
        this.tweens.add({ targets: this.progressShip, x: 360 + 560 * Math.min(1, done), duration: 300 });
        this.comboText.setText(combo >= 2 ? `COMBO ×${combo}` : '');
    }

    // ------------------------------------------------------------------
    // Feedback
    // ------------------------------------------------------------------

    hit(result) {
        this.feedbackText.setText(Phaser.Utils.Array.GetRandom(PRAISE)).setColor('#6fdd86').setScale(0);
        this.tweens.add({ targets: this.feedbackText, scale: 1, duration: 250, ease: 'Back.easeOut' });

        if (result.combo >= 2) {
            this.tweens.add({ targets: this.comboText, scale: 1.3, duration: 120, yoyo: true });
        }

        const laser = this.add.rectangle(SHIP.x + 80, SHIP.y, 0, 6, 0x66ff66).setOrigin(0, 0.5);
        this.tweens.add({
            targets: laser,
            width: TARGET.x - SHIP.x - 80,
            duration: 120,
            ease: 'Power2',
            onComplete: () => {
                laser.destroy();
                // The shake grows with the combo: the thing he is building should feel like it.
                this.cameras.main.shake(160, Math.min(0.012, 0.003 + result.combo * 0.0008));
                this.explodeTarget();
            }
        });
    }

    /** Show the whole fact, flicker the shield. No damage, no lost life. */
    miss(result) {
        this.questionText.setText(result.question.text.replace('?', String(result.answer))).setColor('#ffdd44');
        this.feedbackText.setText('KIJK GOED!').setColor('#ffdd44').setScale(1);

        this.shield.setAlpha(0.9);
        this.tweens.add({
            targets: this.shield,
            alpha: 0.15,
            duration: 110,
            yoyo: true,
            repeat: 4,
            onComplete: () => this.shield.setAlpha(0)
        });
    }

    spawnTarget() {
        this.target = this.add.image(TARGET.x + 200, TARGET.y, 'asteroid').setAlpha(0);
        this.target.setScale(140 / this.target.width);
        this.tweens.add({ targets: this.target, x: TARGET.x, alpha: 1, duration: 500, ease: 'Sine.easeOut' });
    }

    explodeTarget() {
        const target = this.target;
        if (!target?.active) return;
        const { x, y } = target;

        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2;
            const distance = Phaser.Math.Between(90, 180);
            const chunk = this.add.circle(x, y, Phaser.Math.Between(6, 13), Phaser.Utils.Array.GetRandom([0x808080, 0xa0a0a0, 0xff9933]));
            this.tweens.add({
                targets: chunk,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 700,
                ease: 'Cubic.easeOut',
                onComplete: () => chunk.destroy()
            });
        }
        const flash = this.add.circle(x, y, 45, 0xffff66, 0.85);
        this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

        target.destroy();
        this.target = null;
        this.time.delayedCall(350, () => {
            if (this.phase === 'play') this.spawnTarget();
        });
    }

    // ------------------------------------------------------------------
    // End of the leg
    // ------------------------------------------------------------------

    dock() {
        this.phase = 'dock';
        this.finishAndSave();
        this.onDock();
        this.updateHud();

        this.playfield.forEach(item => item.setVisible(false));
        this.comboText.setText('');
        if (this.target) {
            this.tweens.add({ targets: this.target, alpha: 0, duration: 300 });
        }

        const station = this.add.graphics({ x: 1450, y: SHIP.y });
        station.fillStyle(0x333355, 1).fillCircle(0, 0, 60);
        station.lineStyle(10, 0x9999bb, 1).strokeCircle(0, 0, 75);
        station.fillStyle(0x9999bb, 1).fillRect(-150, -8, 300, 16).fillRect(-8, -150, 16, 300);
        station.fillStyle(0x66ccff, 1).fillCircle(0, 0, 18);

        this.tweens.add({
            targets: station,
            x: 1000,
            duration: 1200,
            ease: 'Sine.easeOut',
            onComplete: () => this.tweens.add({
                targets: this.ship,
                x: 860,
                duration: 1300,
                ease: 'Sine.easeInOut',
                onComplete: () => this.showSummary()
            })
        });
        this.tweens.add({ targets: station, angle: 90, duration: 6000, repeat: -1 });
    }

    showSummary() {
        this.phase = 'done';
        const { correct, bestCombo } = this.run.progress;

        this.add.text(640, 150, 'AANGEMEERD!', {
            fontSize: '76px',
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const lines = [`${correct} ${correct === 1 ? 'som' : 'sommen'} juist`];
        if (bestCombo >= 2) lines.push(`Beste combo: ×${bestCombo}`);
        lines.push('', `Tot morgen, ${this.pilotName}!`);
        this.add.text(640, 290, lines.join('\n'), {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5, 0.25);

        this.addButton(640, 640, 280, 80, 'MENU', () => this.scene.start('Start'), 36);
        this.createFireworks();
    }

    createFireworks() {
        [[300, 180], [640, 110], [980, 180]].forEach(([x, y], index) => {
            this.time.delayedCall(index * 220, () => {
                for (let i = 0; i < 18; i++) {
                    const angle = (i / 18) * Math.PI * 2;
                    const spark = this.add.circle(x, y, 5, Phaser.Utils.Array.GetRandom([0xff4444, 0x44ff44, 0x4488ff, 0xffff44, 0xff44ff]));
                    this.tweens.add({
                        targets: spark,
                        x: x + Math.cos(angle) * Phaser.Math.Between(50, 110),
                        y: y + Math.sin(angle) * Phaser.Math.Between(50, 110),
                        alpha: 0,
                        duration: 800,
                        ease: 'Cubic.easeOut',
                        onComplete: () => spark.destroy()
                    });
                }
            });
        });
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    handleKey(event) {
        if (event.repeat) return;
        if (event.key === 'Escape') {
            this.scene.start('Start');
        } else if (event.key === 'Enter' && this.phase === 'intro') {
            this.begin();
        } else if (event.key === 'Enter' && this.phase === 'done') {
            this.scene.start('Start');
        } else if (this.phase === 'play') {
            this.onKey(event);
        }
    }

    /** Log the session once. Runs on docking, on leaving the scene and when the tab closes. */
    finishAndSave() {
        if (!this.run || this.run.progress.finished) return;
        const { answered } = this.run.progress;
        const profile = this.run.finish();
        if (answered > 0) this.save(profile);
    }

    /** A failed save must be visible: a data gap never passes as a clean report. */
    save(profile) {
        try {
            this.store.save(profile);
        } catch (error) {
            console.error('Saving the profile failed', error);
            if (this.saveWarning || !this.sys.isActive()) return;
            this.saveWarning = this.add.text(640, 700, '⚠ Voortgang kon niet bewaard worden. Vraag een ouder om te kijken.', {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ffaa44'
            }).setOrigin(0.5);
        }
    }

    showProblem(text, error) {
        console.error(error);
        this.phase = 'problem';
        this.add.text(640, 320, text, {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        this.addButton(640, 560, 280, 80, '◀ TERUG', () => this.scene.start('Start'), 36);
    }

    cleanUp() {
        this.finishAndSave();
        window.removeEventListener('pagehide', this.onPageHide);
        window.removeEventListener('pageshow', this.onPageShow);
    }

    /** Same look as the Start menu buttons. */
    addButton(x, y, width, height, label, onClick, fontSize = 32, fill = 0x4444ff, hover = 0x6666ff) {
        const bg = this.add.rectangle(x, y, width, height, fill, 0.85).setStrokeStyle(3, 0xffffff);
        const text = this.add.text(x, y, label, {
            fontSize: `${fontSize}px`,
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(hover, 0.85));
        bg.on('pointerout', () => bg.setFillStyle(fill, 0.85));
        bg.on('pointerdown', onClick);
        return [bg, text];
    }
}
