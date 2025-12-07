/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */


export class Game extends Phaser.Scene {

    constructor() {
        super('Game');   // Scene key must match Start scene
    }

    preload() {
        this.load.image('background', 'assets/space.png');
        this.load.spritesheet('ship', 'assets/spaceship.png', {
            frameWidth: 176,
            frameHeight: 96
        });
    }

    create() {

        // Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');

        // Create animation on scene's animation manager
        // Check if animation already exists to avoid duplicates
        if (!this.anims.exists('fly')) {
            this.anims.create({
                key: 'fly',
                frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: -1
            });
        }

        // Animated ship
        const ship = this.add.sprite(640, 360, 'ship');
        ship.play('fly');

        // ------------------------------------------------
        // INTRO TEXT
        // ------------------------------------------------
        const introText = 
            "Welkom aan boord kapitein.\n" +
            "Je bent aan boord van het ruimteschip Newton en jouw missie — " +
            "als je ze aanvaardt — is om de juiste weg te vinden door een asteroïdenveld.\n\n" +
            "Los de sommen op door het juiste antwoord aan te duiden en zo je schip tussen de rotsblokken te sturen.\n" +
            "Gebruik de [ENTER] toets om verder te gaan en [ESC] om terug te keren naar het hoofdmenu. Succes!";

        this.add.text(640, 120, introText, {
            fontSize: '22px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 1100 }
        }).setOrigin(0.5, 0);

        // ESC to return to menu
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('Start');
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.scene.start('HyperJump');
        });
    }

    update() {
        this.background.tilePositionX += 2;
    }
}