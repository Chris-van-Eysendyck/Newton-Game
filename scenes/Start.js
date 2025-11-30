/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */


export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('background', 'assets/space.png');
        this.load.image('logo', 'assets/NEWTON.png');
        this.load.spritesheet('ship', 'assets/spaceship.png', { frameWidth: 176, frameHeight: 96 });
        this.load.image('menuPanel', 'assets/BG_button_2.jpeg');
    }

    create() {
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');

        const logo = this.add.image(640, 200, 'logo');

        // Create animation on the scene's animation manager (not on the sprite)
        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
            frameRate: 15,
            repeat: -1
        });

        const ship = this.add.sprite(640, 360, 'ship');
        ship.play('fly');

        this.tweens.add({
            targets: logo,
            y: 400,
            duration: 1500,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        // -------------------------------
        // MENU BUTTONS CONFIG
        // -------------------------------
        const menuItems = [
            { text: 'NIEUW SPEL', callback: () => this.startNewGame() },
            { text: 'LAAD SPEL',  callback: () => this.loadGame() },
            { text: 'STOP',       callback: () => this.stopGame() }
        ];

        const startY = 500;
        const spacing = 90;           // MORE SPACE BETWEEN BUTTONS
        const fontStyle = {
            fontSize: '42px',
            fontFamily: 'Arial',
            color: '#ffffff'
        };

        // -------------------------------
        // CREATE BUTTONS
        // -------------------------------
        menuItems.forEach((item, i) => {

            const yPos = startY + i * spacing;

            // Create the text
            const button = this.add.text(640, yPos, item.text, fontStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => button.setStyle({ color: '#ffff66' }))
                .on('pointerout',  () => button.setStyle({ color: '#ffffff' }))
                .on('pointerdown', item.callback);

            // Keep text visually over background
            button.depth = 2;
        });
    }

    update() {
        this.background.tilePositionX += 2;
    }

    startNewGame() {
        this.scene.start('Game');  
    }

    loadGame() {
        console.log("Load game clicked");
    }

    stopGame() {
        this.game.destroy(true);
    }
}