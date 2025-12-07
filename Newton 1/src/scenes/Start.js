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
        // Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');

        const logo = this.add.image(640, 200, 'logo');

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
            y: 180,
            duration: 1500,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        // Title text
        const titleText = this.add.text(640, 280, 'KIES JE LEVEL', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // -------------------------------------------------------------
        // LEVEL SELECTION BUTTONS - HORIZONTAL GRID
        // -------------------------------------------------------------
        const levels = [
            { 
                number: 1, 
                name: 'LEVEL 1',
                description: 'Plus & Min (0-10)',
                scene: 'Level1',
                available: true
            },
            { 
                number: 2, 
                name: 'LEVEL 2',
                description: 'Plus & Min (0-20)',
                scene: 'Level2',
                available: true
            },
            { 
                number: 3, 
                name: 'LEVEL 3',
                description: 'Splitsen? komt eraan...',
                scene: 'Level3',
                available: false
            }
        ];

        // Grid layout - 3 levels in a row
        const startX = 320;  // Start position for first button
        const spacingX = 320; // Horizontal spacing between buttons
        const yPos = 480;     // Vertical position for all buttons

        levels.forEach((level, i) => {
            const xPos = startX + i * spacingX;
            
            // Level button
            const button = this.add.text(xPos, yPos, level.name, {
                fontSize: '38px',
                fontFamily: 'Arial',
                color: level.available ? '#ffffff' : '#666666',
                fontStyle: 'bold'
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: level.available })
            .on('pointerover', function() {
                if (level.available) {
                    this.setStyle({ color: '#ffff66' });
                }
            })
            .on('pointerout', function() {
                if (level.available) {
                    this.setStyle({ color: '#ffffff' });
                }
            })
            .on('pointerdown', () => {
                if (level.available) {
                    this.startLevel(level.scene);
                }
            });

            // Description text (smaller, below button)
            this.add.text(xPos, yPos + 35, level.description, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: level.available ? '#aaaaaa' : '#444444',
                fontStyle: 'italic',
                align: 'center',
                wordWrap: { width: 250 }
            }).setOrigin(0.5);

            // Lock icon for unavailable levels
            if (!level.available) {
                this.add.text(xPos, yPos - 40, '🔒', {
                    fontSize: '32px'
                }).setOrigin(0.5);
            } else {
                // Star icon for available levels
                this.add.text(xPos, yPos - 40, '⭐', {
                    fontSize: '32px'
                }).setOrigin(0.5);
            }
        }); // End of levels.forEach

        // -------------------------------------------------------------
        // CONTACT / FEEDBACK SECTION
        // -------------------------------------------------------------
        const feedbackY = 620;
        
        this.add.text(640, feedbackY, 'Feedback? Contacteer ons:', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        const emailText = this.add.text(640, feedbackY + 25, 'ravendatainsight@gmail.com', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#00aaff',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function() {
            this.setStyle({ color: '#66ddff' });
        })
        .on('pointerout', function() {
            this.setStyle({ color: '#00aaff' });
        })
        .on('pointerdown', () => {
            // Open email client
            window.location.href = 'mailto: ravendatainsight@gmail.com?subject=Newton Game Feedback';
        });
    }

    update() {
        this.background.tilePositionX += 2;
    }

    startLevel(sceneName) {
        console.log(`Starting ${sceneName}`);
        this.scene.start(sceneName);
    }
}