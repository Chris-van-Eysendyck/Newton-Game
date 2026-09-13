/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 * 
 * RESPONSIVE VERSION - Main Menu
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
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        // Background
        this.background = this.add.tileSprite(centerX, centerY, width, height, 'background');

        // Logo - responsive position and scale
        const logoScale = Math.min(width / 1280, height / 720);
        const logo = this.add.image(centerX, height * 0.15, 'logo');
        logo.setScale(logoScale);

        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
            frameRate: 15,
            repeat: -1
        });

        const ship = this.add.sprite(centerX, centerY, 'ship');
        ship.play('fly');
        ship.setScale(logoScale);

        this.tweens.add({
            targets: logo,
            y: height * 0.15 - 20,
            duration: 1500,
            ease: 'Sine.inOut',
            yoyo: true,
            loop: -1
        });

        // Title text - responsive font size
        const titleFontSize = Math.min(48, width / 15);
        const titleText = this.add.text(centerX, height * 0.28, 'KIES JE LEVEL', {
            fontSize: `${titleFontSize}px`,
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // -------------------------------------------------------------
        // LEVEL SELECTION BUTTONS - RESPONSIVE GRID
        // -------------------------------------------------------------
        const levels = [
            { 
                number: 1, 
                name: 'LEVEL 1',
                description: 'Plus en Min (0-10)',
                scene: 'Level1',
                available: true
            },
            { 
                number: 2, 
                name: 'LEVEL 2',
                description: 'Plus en Min (0-20)',
                scene: 'Level2',
                available: true
            },
            { 
                number: 3, 
                name: 'LEVEL 3',
                description: 'Splitsen kan ik! (1-10)',
                scene: 'Level3',
                available: true
            },
            { 
                number: 4, 
                name: 'LEVEL 4',
                description: 'Splitsen kan ik! (1-20)',
                scene: 'Level4',
                available: true
            }
        ];

        // Responsive grid layout
        const isMobile = width < 768;
        const cols = isMobile ? 1 : 2;  // 1 column on mobile, 2 on desktop
        const buttonWidth = isMobile ? width * 0.8 : width * 0.35;
        const buttonHeight = Math.min(height * 0.12, 100);
        const buttonFontSize = Math.min(38, width / 20);
        const descFontSize = Math.min(16, width / 40);
        
        const startY = height * 0.42;
        const spacingY = buttonHeight + (height * 0.05);

        levels.forEach((level, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const xPos = isMobile ? centerX : (col === 0 ? width * 0.3 : width * 0.7);
            const yPos = startY + row * spacingY;
            
            // Button background
            const buttonBg = this.add.rectangle(
                xPos, 
                yPos, 
                buttonWidth, 
                buttonHeight, 
                level.available ? 0x4444ff : 0x333333, 
                0.8
            );
            buttonBg.setStrokeStyle(3, level.available ? 0xffffff : 0x666666);
            
            if (level.available) {
                buttonBg.setInteractive({ useHandCursor: true });
                
                buttonBg.on('pointerover', function() {
                    this.setFillStyle(0x6666ff);
                });
                
                buttonBg.on('pointerout', function() {
                    this.setFillStyle(0x4444ff);
                });
                
                buttonBg.on('pointerdown', () => {
                    // Visual feedback
                    this.tweens.add({
                        targets: buttonBg,
                        scaleX: 0.95,
                        scaleY: 0.95,
                        duration: 100,
                        yoyo: true,
                        onComplete: () => {
                            this.startLevel(level.scene);
                        }
                    });
                });
            }
            
            // Level name
            const levelText = this.add.text(xPos, yPos - buttonHeight * 0.15, level.name, {
                fontSize: `${buttonFontSize}px`,
                fontFamily: 'Arial',
                color: level.available ? '#ffffff' : '#666666',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);

            // Description text
            this.add.text(xPos, yPos + buttonHeight * 0.15, level.description, {
                fontSize: `${descFontSize}px`,
                fontFamily: 'Arial',
                color: level.available ? '#ffff00' : '#444444',
                fontStyle: 'italic',
                align: 'center',
                wordWrap: { width: buttonWidth * 0.9 }
            }).setOrigin(0.5);

            // Icon
            const iconY = yPos - buttonHeight * 0.5;
            if (!level.available) {
                this.add.text(xPos, iconY, '🔒', {
                    fontSize: `${buttonFontSize * 0.8}px`
                }).setOrigin(0.5);
            } else {
                this.add.text(xPos, iconY, '⭐', {
                    fontSize: `${buttonFontSize * 0.8}px`
                }).setOrigin(0.5);
            }
        });

        // -------------------------------------------------------------
        // CONTACT / FEEDBACK SECTION - Responsive
        // -------------------------------------------------------------
        const feedbackY = height * 0.88;
        const feedbackFontSize = Math.min(18, width / 40);
        const emailFontSize = Math.min(20, width / 35);
        
        this.add.text(centerX, feedbackY, 'Feedback? Contacteer ons:', {
            fontSize: `${feedbackFontSize}px`,
            fontFamily: 'Arial',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        const emailText = this.add.text(centerX, feedbackY + height * 0.04, 'ravendatainsight@gmail.com', {
            fontSize: `${emailFontSize}px`,
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
            window.location.href = 'mailto:ravendatainsight@gmail.com?subject=Newton Game Feedback';
        });

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        const centerX = width / 2;
        const centerY = height / 2;

        if (this.background) {
            this.background.setPosition(centerX, centerY);
            this.background.setSize(width, height);
        }
    }

    update() {
        this.background.tilePositionX += 2;
    }

    startLevel(sceneName) {
        console.log(`Starting ${sceneName}`);
        
        // Store the target level in registry
        this.registry.set('targetLevel', sceneName);
        
        // Transition through HyperJump scene first
        this.scene.start('HyperJump');
    }
}