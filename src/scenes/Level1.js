/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 * 
 * RESPONSIVE VERSION - Works on mobile, tablet, and desktop
 */

export class Level1 extends Phaser.Scene {

    constructor() {
        super('Level1');
        console.log('Level1 constructor called');
    }

    preload() {
        console.log('Level1 preload started');
        // Assets might already be loaded from previous scenes
        if (!this.textures.exists('background')) {
            this.load.image('background', 'assets/space.png');
        }
        if (!this.textures.exists('ship')) {
            this.load.spritesheet('ship', 'assets/spaceship.png', {
                frameWidth: 176,
                frameHeight: 96
            });
        }
        if (!this.textures.exists('mathBg')) {
            this.load.image('mathBg', 'assets/Newton_menu_background_small.jpg');
        }
        if (!this.textures.exists('asteroid')) {
            this.load.image('asteroid', 'assets/Asteroid2.png');
        }
        console.log('Level1 preload complete');
    }

    create() {
        console.log('Level1 create started');

        // Get screen dimensions (these update automatically on resize)
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        // Track game start (privacy-friendly analytics)
        this.trackGameStart();

        // Background - scale to cover screen
        this.background = this.add.tileSprite(centerX, centerY, width, height, 'background');
        console.log('Background created');

        // Create animation on scene's animation manager
        if (!this.anims.exists('fly')) {
            this.anims.create({
                key: 'fly',
                frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: -1
            });
            console.log('Animation created');
        }

        // Animated ship - positioned responsively
        this.ship = this.add.sprite(centerX, centerY, 'ship');
        this.ship.play('fly');
        // Scale ship based on screen size
        const shipScale = Math.min(width / 1280, height / 720);
        this.ship.setScale(shipScale);
        console.log('Ship created and animated');

        // Add floating asteroid on the right side - responsive position
        this.asteroid = this.add.image(width * 0.75, centerY * 0.95, 'asteroid');
        this.asteroid.setScale(0.3 * shipScale);
        console.log('Asteroid created');

        // ------------------------------------------------
        // LEVEL 1 INTRO TEXT - Responsive sizing
        // ------------------------------------------------
        const fontSize = Math.min(28, width / 30);
        const levelText = "LEVEL 1 - Welkom Kapitein!\n\nGebruik de toetsen met getallen (0-9) om te antwoorden.\nDruk op [ENTER] om te antwoorden.\nDruk op [BACKSPACE] om te wissen.\n\nDruk op [ENTER] om te starten of [ESC] om terug te gaan.";

        this.levelText = this.add.text(centerX, height * 0.15, levelText, {
            fontSize: `${fontSize}px`,
            color: '#00ff00',
            align: 'center',
            wordWrap: { width: width * 0.85 }
        }).setOrigin(0.5, 0);
        
        // Add START button for mobile users
        const buttonWidth = Math.min(width * 0.5, 300);
        const buttonHeight = Math.min(height * 0.08, 80);
        const buttonFontSize = Math.min(32, width / 20);
        
        this.startButton = this.add.rectangle(
            centerX,
            height * 0.75,
            buttonWidth,
            buttonHeight,
            0x44ff44,
            0.9
        );
        this.startButton.setStrokeStyle(4, 0xffffff);
        this.startButton.setInteractive({ useHandCursor: true });
        
        this.startButtonText = this.add.text(centerX, height * 0.75, 'START ▶', {
            fontSize: `${buttonFontSize}px`,
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Set up hover effects first
        this.startButton.on('pointerover', () => {
            if (this.startButton) {
                this.startButton.setFillStyle(0x66ff66);
            }
        });
        
        this.startButton.on('pointerout', () => {
            if (this.startButton) {
                this.startButton.setFillStyle(0x44ff44);
            }
        });
        
        // Then the click handler
        this.startButton.on('pointerdown', () => {
            console.log('START button pressed');
            if (this.levelText) this.levelText.destroy();
            this.levelText = null;
            if (this.startButton) this.startButton.destroy();
            if (this.startButtonText) this.startButtonText.destroy();
            this.startButton = null;
            this.startButtonText = null;
            this.showMathProblem();
        });
        
        console.log('Text and START button created');

        // Game state variables
        this.mathPanel = null;
        this.mathProblemText = null;
        this.playerInput = '';
        this.inputDisplay = null;
        this.instructionText = null;
        this.touchButtons = [];  // Touch number pad buttons
        this.submitButton = null;
        this.clearButton = null;
        this.startButton = null;  // Intro screen start button
        this.startButtonText = null;
        this.currentAnswer = null;
        this.score = 0;
        this.scoreText = null;
        this.targetScore = 10;
        this.inputEnabled = false;
        this.asteroidHits = 0;

        // Setup keyboard listeners
        this.setupKeyboardListeners();

        // Listen for screen resize
        this.scale.on('resize', this.handleResize, this);

        console.log('Level1 create complete');
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        const centerX = width / 2;
        const centerY = height / 2;

        // Reposition background
        if (this.background) {
            this.background.setPosition(centerX, centerY);
            this.background.setSize(width, height);
        }

        // Reposition ship
        if (this.ship) {
            this.ship.setPosition(centerX, centerY);
            const shipScale = Math.min(width / 1280, height / 720);
            this.ship.setScale(shipScale);
        }

        // Reposition asteroid
        if (this.asteroid) {
            this.asteroid.setPosition(width * 0.75, centerY * 0.95);
        }

        // Re-layout touch buttons if they exist
        if (this.touchButtons.length > 0) {
            this.destroyTouchButtons();
            this.createTouchButtons();
        }
    }

    setupKeyboardListeners() {
        // ENTER to start playing or submit answer
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.levelText) {
                console.log('ENTER pressed - starting game');
                this.levelText.destroy();
                this.levelText = null;
                if (this.startButton) this.startButton.destroy();
                if (this.startButtonText) this.startButtonText.destroy();
                this.showMathProblem();
            } else if (this.mathProblemText && this.inputEnabled) {
                this.submitAnswer();
            }
        });

        // ESC to return to menu
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC pressed - returning to Start');
            this.scene.start('Start');
        });

        // Listen to ALL key presses and filter for numbers
        this.input.keyboard.on('keydown', (event) => {
            if (this.mathProblemText && !this.levelText && this.inputEnabled) {
                const key = event.key;
                
                if (key >= '0' && key <= '9' && !event.code.startsWith('Numpad')) {
                    this.onNumberPressed(parseInt(key));
                    console.log(`Number key detected: ${key}`);
                }
                
                if (key === 'Backspace' || key === 'Delete') {
                    this.clearInput();
                }
            }
        });

        // Numpad keys
        const numpadKeys = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        numpadKeys.forEach((keyName, index) => {
            this.input.keyboard.on(`keydown-NUMPAD_${keyName}`, () => {
                if (this.mathProblemText && !this.levelText && this.inputEnabled) {
                    this.onNumberPressed(index);
                }
            });
        });
    }

    generateMathProblem() {
        const operators = ['+', '-'];
        const operator = Phaser.Math.RND.pick(operators);
        
        let num1, num2, answer;
        
        if (operator === '+') {
            num1 = Phaser.Math.Between(0, 10);
            num2 = Phaser.Math.Between(0, 10 - num1);
            answer = num1 + num2;
            console.log(`Generated ADDITION: ${num1} + ${num2} = ${answer}`);
        } else {
            num1 = Phaser.Math.Between(1, 10);
            num2 = Phaser.Math.Between(0, num1);
            answer = num1 - num2;
            console.log(`Generated SUBTRACTION: ${num1} - ${num2} = ${answer}`);
        }
        
        return {
            question: `${num1} ${operator} ${num2} = ?`,
            answer: answer
        };
    }

    showMathProblem() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // Reset player input
        this.playerInput = '';
        this.inputEnabled = true;
        
        // Determine if we're on mobile (smaller screen)
        const isMobile = width < 768;
        
        // DESKTOP LAYOUT: Math panel on left, asteroid on right
        // MOBILE LAYOUT: Everything stacked vertically
        
        let panelX, panelY, panelScale;
        
        if (isMobile) {
            // MOBILE: Panel at top, centered
            panelX = centerX;
            panelY = height * 0.18;
            panelScale = Math.min(width / 2000, height / 2000);
        } else {
            // DESKTOP: Panel on left side
            panelX = width * 0.22;
            panelY = height * 0.42;
            panelScale = Math.min(width / 2560, height / 1440);
        }
        
        // Create background panel
        if (!this.mathPanel) {
            this.mathPanel = this.add.image(panelX, panelY, 'mathBg');
            this.mathPanel.setScale(panelScale);
            this.mathPanel.setAlpha(0.9);
        } else {
            this.mathPanel.setPosition(panelX, panelY);
            this.mathPanel.setScale(panelScale);
        }
        
        // Create score counter
        if (!this.scoreText) {
            const scoreFontSize = Math.min(36, width / 20);
            this.scoreText = this.add.text(centerX, height * 0.05, `Score: ${this.score} / ${this.targetScore}`, {
                fontSize: `${scoreFontSize}px`,
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }
        
        // Generate random math problem
        const problem = this.generateMathProblem();
        this.currentAnswer = problem.answer;
        
        // Display the math problem
        const problemFontSize = isMobile ? Math.min(40, width / 12) : Math.min(48, width / 15);
        if (this.mathProblemText) {
            this.mathProblemText.setText(problem.question);
            this.mathProblemText.setPosition(panelX, panelY - (isMobile ? height * 0.02 : height * 0.03));
            this.mathProblemText.setFontSize(problemFontSize);
        } else {
            this.mathProblemText = this.add.text(panelX, panelY - (isMobile ? height * 0.02 : height * 0.03), problem.question, {
                fontSize: `${problemFontSize}px`,
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        // Display player input area
        const inputFontSize = isMobile ? Math.min(36, width / 14) : Math.min(40, width / 18);
        if (this.inputDisplay) {
            this.inputDisplay.setText('__');
            this.inputDisplay.setColor('#ffff00');
            this.inputDisplay.setAlpha(1);
            this.inputDisplay.setPosition(panelX, panelY + (isMobile ? height * 0.04 : height * 0.06));
            this.inputDisplay.setFontSize(inputFontSize);
        } else {
            this.inputDisplay = this.add.text(panelX, panelY + (isMobile ? height * 0.04 : height * 0.06), '__', {
                fontSize: `${inputFontSize}px`,
                color: '#ffff00',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        // Add instruction text (only on desktop to save space)
        if (!isMobile) {
            if (!this.instructionText) {
                const instrFontSize = Math.min(20, width / 40);
                this.instructionText = this.add.text(panelX, panelY + height * 0.15, 'Typ je antwoord en druk op [ENTER]', {
                    fontSize: `${instrFontSize}px`,
                    color: '#ffff00',
                    align: 'center'
                }).setOrigin(0.5);
            }
        } else if (this.instructionText) {
            this.instructionText.setVisible(false);
        }
        
        // Create touch buttons
        this.createTouchButtons();
        
        console.log(`Math problem: ${problem.question} (Answer: ${problem.answer})`);
    }

    createTouchButtons() {
        // Always create touch buttons - they work on desktop too!
        const { width, height } = this.scale;
        const isMobile = width < 768;

        // Clear existing buttons
        this.destroyTouchButtons();

        // MOBILE: Buttons below the math panel
        // DESKTOP: Buttons on the right side (less intrusive)
        
        let buttonSize, fontSize, padding, startX, startY, cols;
        
        if (isMobile) {
            // MOBILE LAYOUT - below math problem
            buttonSize = Math.min(width / 6.5, height / 10, 70);
            fontSize = Math.min(20, buttonSize * 0.45);
            padding = buttonSize * 0.15;
            startX = width * 0.12;
            startY = height * 0.38;  // Start below the math panel
            cols = 5;
        } else {
            // DESKTOP LAYOUT - right side
            buttonSize = Math.min(width / 12, height / 12, 60);
            fontSize = Math.min(18, buttonSize * 0.4);
            padding = buttonSize * 0.2;
            startX = width * 0.65;
            startY = height * 0.35;
            cols = 5;
        }

        // Create number pad (0-9) in grid layout
        for (let i = 0; i <= 9; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (buttonSize + padding);
            const y = startY + row * (buttonSize + padding);

            // Button background
            const btn = this.add.rectangle(x, y, buttonSize, buttonSize, 0x4444ff, 0.8);
            btn.setStrokeStyle(2, 0xffffff);
            btn.setInteractive({ useHandCursor: true });

            // Button text
            const btnText = this.add.text(x, y, i.toString(), {
                fontSize: `${fontSize}px`,
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Button behavior
            btn.on('pointerdown', () => {
                if (this.inputEnabled) {
                    this.onNumberPressed(i);
                    // Visual feedback
                    this.tweens.add({
                        targets: [btn, btnText],
                        scaleX: 0.9,
                        scaleY: 0.9,
                        duration: 100,
                        yoyo: true
                    });
                }
            });

            btn.on('pointerover', () => {
                if (this.inputEnabled) {
                    btn.setFillStyle(0x6666ff);
                }
            });

            btn.on('pointerout', () => {
                btn.setFillStyle(0x4444ff);
            });

            this.touchButtons.push(btn, btnText);
        }

        // Action buttons layout
        let submitX, submitY, submitWidth, submitHeight, clearY;
        
        if (isMobile) {
            // MOBILE: Action buttons centered below number pad
            submitX = width * 0.3;
            submitY = startY + 2 * (buttonSize + padding) + padding * 2;
            submitWidth = buttonSize * 1.8;
            submitHeight = buttonSize * 0.9;
            clearY = submitY;
        } else {
            // DESKTOP: Action buttons to the right of number pad
            submitX = startX + 5 * (buttonSize + padding) + buttonSize;
            submitY = startY;
            submitWidth = buttonSize * 2;
            submitHeight = buttonSize;
            clearY = startY + buttonSize + padding;
        }

        // Submit button (OK)
        this.submitButton = this.add.rectangle(submitX, submitY, submitWidth, submitHeight, 0x44ff44, 0.9);
        this.submitButton.setStrokeStyle(3, 0xffffff);
        this.submitButton.setInteractive({ useHandCursor: true });

        const submitText = this.add.text(submitX, submitY, 'OK ✓', {
            fontSize: `${fontSize * 1.1}px`,
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.submitButton.on('pointerdown', () => {
            if (this.inputEnabled) {
                this.submitAnswer();
                this.tweens.add({
                    targets: [this.submitButton, submitText],
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 100,
                    yoyo: true
                });
            }
        });

        this.submitButton.on('pointerover', () => {
            if (this.inputEnabled && this.submitButton) {
                this.submitButton.setFillStyle(0x66ff66);
            }
        });

        this.submitButton.on('pointerout', () => {
            if (this.submitButton) {
                this.submitButton.setFillStyle(0x44ff44);
            }
        });

        this.touchButtons.push(this.submitButton, submitText);

        // Clear button (WISSEN)
        const clearX = isMobile ? width * 0.7 : submitX;
        this.clearButton = this.add.rectangle(clearX, clearY, submitWidth, submitHeight, 0xff4444, 0.9);
        this.clearButton.setStrokeStyle(3, 0xffffff);
        this.clearButton.setInteractive({ useHandCursor: true });

        const clearText = this.add.text(clearX, clearY, 'WISSEN ×', {
            fontSize: `${fontSize * 1.1}px`,
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.clearButton.on('pointerdown', () => {
            if (this.inputEnabled) {
                this.clearInput();
                this.tweens.add({
                    targets: [this.clearButton, clearText],
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 100,
                    yoyo: true
                });
            }
        });

        this.clearButton.on('pointerover', () => {
            if (this.inputEnabled && this.clearButton) {
                this.clearButton.setFillStyle(0xff6666);
            }
        });

        this.clearButton.on('pointerout', () => {
            if (this.clearButton) {
                this.clearButton.setFillStyle(0xff4444);
            }
        });

        this.touchButtons.push(this.clearButton, clearText);
    }

    destroyTouchButtons() {
        this.touchButtons.forEach(btn => btn.destroy());
        this.touchButtons = [];
        this.submitButton = null;
        this.clearButton = null;
    }

    onNumberPressed(num) {
        // Limit input to 2 digits (0-10)
        if (this.playerInput.length < 2) {
            this.playerInput += num.toString();
            this.inputDisplay.setText(this.playerInput || '__');
            console.log('Input:', this.playerInput);
            
            // Visual feedback
            this.tweens.add({
                targets: this.inputDisplay,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    clearInput() {
        if (this.playerInput.length > 0) {
            this.playerInput = this.playerInput.slice(0, -1);
            this.inputDisplay.setText(this.playerInput || '__');
            console.log('Input cleared to:', this.playerInput);
            
            // Visual feedback
            this.tweens.add({
                targets: this.inputDisplay,
                alpha: 0.5,
                duration: 100,
                yoyo: true
            });
        }
    }

    submitAnswer() {
        if (this.playerInput === '') {
            console.log('No input to submit');
            return;
        }

        const playerAnswer = parseInt(this.playerInput);
        console.log(`Player answered: ${playerAnswer}, Correct answer: ${this.currentAnswer}`);

        if (playerAnswer === this.currentAnswer) {
            // CORRECT ANSWER
            this.score++;
            console.log('Correct! Score:', this.score);
            
            this.scoreText.setText(`Score: ${this.score} / ${this.targetScore}`);
            
            this.tweens.add({
                targets: this.scoreText,
                scale: 1.3,
                duration: 200,
                yoyo: true
            });
            
            this.disableInput();
            this.fireLaser();
            this.correctAnswerCelebration();
            
            if (this.score >= this.targetScore) {
                this.time.delayedCall(2000, () => {
                    this.levelComplete();
                });
            } else {
                this.time.delayedCall(1500, () => {
                    this.enableInput();
                    this.showMathProblem();
                });
            }
            
        } else {
            // WRONG ANSWER
            console.log('Wrong answer!');
            this.disableInput();
            
            this.inputDisplay.setColor('#ff0000');
            
            const { width, height } = this.scale;
            const wrongMessages = ['OEPS!', 'PROBEER OPNIEUW!', 'NIET JUIST!', 'HELAAS!'];
            const message = Phaser.Math.RND.pick(wrongMessages);
            const wrongFontSize = Math.min(64, width / 12);
            
            const wrongText = this.add.text(width / 2, height * 0.28, message, {
                fontSize: `${wrongFontSize}px`,
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: wrongText,
                x: width / 2 + 10,
                duration: 50,
                yoyo: true,
                repeat: 5,
                onComplete: () => {
                    this.tweens.add({
                        targets: wrongText,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => wrongText.destroy()
                    });
                }
            });
            
            const redFlash = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0.3);
            this.tweens.add({
                targets: redFlash,
                alpha: 0,
                duration: 500,
                onComplete: () => redFlash.destroy()
            });
            
            this.wrongAnswerAnimation();
            
            this.time.delayedCall(1500, () => {
                this.inputDisplay.setColor('#ffff00');
                this.playerInput = '';
                this.inputDisplay.setText('__');
                this.enableInput();
            });
        }
    }

    levelComplete() {
        console.log('Level 1 Complete!');
        this.trackLevelComplete();

        const { width, height } = this.scale;

        this.fireLaser(() => {
            this.explodeAsteroid();
        });

        this.createFireworks();

        const victoryFontSize = Math.min(64, width / 12);
        const victoryText = this.add.text(width / 2, height / 2, 'LEVEL VOLTOOID!\n🌟🌟🌟', {
            fontSize: `${victoryFontSize}px`,
            color: '#6fdd86',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        victoryText.setScale(0);
        this.tweens.add({
            targets: victoryText,
            scale: 1.2,
            duration: 600,
            ease: 'Back.easeOut'
        });

        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffd700, 0.4);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 1000
        });

        this.time.delayedCall(3000, () => {
            this.scene.start('Start');
        });
    }

    createFireworks() {
        const { width, height } = this.scale;
        const positions = [
            { x: width * 0.25, y: height * 0.28 },
            { x: width * 0.5, y: height * 0.21 },
            { x: width * 0.75, y: height * 0.28 },
            { x: width * 0.31, y: height * 0.69 },
            { x: width * 0.69, y: height * 0.69 }
        ];
        
        positions.forEach((pos, index) => {
            this.time.delayedCall(index * 200, () => {
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    const distance = Phaser.Math.Between(50, 120);
                    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
                    const color = Phaser.Math.RND.pick(colors);
                    
                    const particle = this.add.circle(pos.x, pos.y, 5, color);
                    
                    this.tweens.add({
                        targets: particle,
                        x: pos.x + Math.cos(angle) * distance,
                        y: pos.y + Math.sin(angle) * distance,
                        alpha: 0,
                        scale: 0.5,
                        duration: 800,
                        ease: 'Cubic.easeOut',
                        onComplete: () => particle.destroy()
                    });
                }
            });
        });
    }

    correctAnswerCelebration() {
        const { width, height } = this.scale;

        this.inputDisplay.setColor('#00ff00');
        this.tweens.add({
            targets: this.inputDisplay,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            repeat: 2
        });

        const praises = ['SUPER!', 'GEWELDIG!', 'FANTASTISCH!', 'TOP!', 'PERFECT!', 'GOED ZO!'];
        const praise = Phaser.Math.RND.pick(praises);
        const praiseFontSize = Math.min(72, width / 10);
        
        const praiseText = this.add.text(width / 2, height * 0.28, praise, {
            fontSize: `${praiseFontSize}px`,
            color: '#6fdd86',
            fontStyle: 'bold',
            stroke: '#ff00ff',
            strokeThickness: 0
        }).setOrigin(0.5);
        
        praiseText.setScale(0);
        this.tweens.add({
            targets: praiseText,
            scale: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: praiseText,
                    alpha: 0,
                    scale: 1.5,
                    duration: 400,
                    delay: 400,
                    onComplete: () => praiseText.destroy()
                });
            }
        });

        // Determine panel position (same as in showMathProblem)
        const isMobile = width < 768;
        const panelX = isMobile ? width / 2 : width * 0.22;
        const panelY = isMobile ? height * 0.18 : height * 0.42;
        const inputOffsetY = isMobile ? height * 0.04 : height * 0.06;
        this.createSparkles(panelX, panelY + inputOffsetY);

        this.tweens.add({
            targets: this.ship,
            angle: 360,
            duration: 800,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                this.ship.angle = 0;
            }
        });

        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffff00, 0.3);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });

        if (this.mathPanel) {
            this.tweens.add({
                targets: this.mathPanel,
                scaleX: this.mathPanel.scaleX * 1.1,
                scaleY: this.mathPanel.scaleY * 1.1,
                duration: 150,
                yoyo: true,
                repeat: 1
            });
        }
    }

    createSparkles(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 60;
            
            const sparkle = this.add.circle(x, y, 4, 0xffff00);
            
            this.tweens.add({
                targets: sparkle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 2,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => sparkle.destroy()
            });
        }
    }

    disableInput() {
        this.inputEnabled = false;
        if (this.inputDisplay) {
            this.inputDisplay.setAlpha(0.5);
        }
        // Disable touch buttons
        if (this.submitButton) this.submitButton.disableInteractive();
        if (this.clearButton) this.clearButton.disableInteractive();
        this.touchButtons.forEach(btn => {
            if (btn.input) btn.disableInteractive();
        });
    }

    enableInput() {
        this.inputEnabled = true;
        if (this.inputDisplay) {
            this.inputDisplay.setAlpha(1);
        }
        // Enable touch buttons
        if (this.submitButton) this.submitButton.setInteractive({ useHandCursor: true });
        if (this.clearButton) this.clearButton.setInteractive({ useHandCursor: true });
        this.touchButtons.forEach(btn => {
            if (btn.setInteractive) btn.setInteractive({ useHandCursor: true });
        });
    }

    wrongAnswerAnimation() {
        console.log('Ship hit by wrong answer!');
        
        const originalX = this.ship.x;
        const originalY = this.ship.y;
        
        this.tweens.add({
            targets: this.ship,
            angle: -30,
            x: originalX - 80,
            y: originalY + 50,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.tweens.add({
                    targets: this.ship,
                    angle: 30,
                    x: originalX + 80,
                    y: originalY - 50,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        this.tweens.add({
                            targets: this.ship,
                            angle: 0,
                            x: originalX,
                            y: originalY,
                            duration: 400,
                            ease: 'Bounce.easeOut'
                        });
                    }
                });
            }
        });
        
        // Impact sparks
        for (let i = 0; i < 15; i++) {
            this.time.delayedCall(i * 30, () => {
                const angle = Math.random() * Math.PI * 2;
                const distance = Phaser.Math.Between(20, 60);
                
                const spark = this.add.circle(
                    this.ship.x,
                    this.ship.y,
                    Phaser.Math.Between(2, 5),
                    0xff6600
                );
                
                this.tweens.add({
                    targets: spark,
                    x: this.ship.x + Math.cos(angle) * distance,
                    y: this.ship.y + Math.sin(angle) * distance,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => spark.destroy()
                });
            });
        }
        
        // Ship flashes red
        this.tweens.add({
            targets: this.ship,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 3
        });
    }

    fireLaser(onComplete) {
        console.log('Firing laser!');
        
        const laser = this.add.rectangle(
            this.ship.x,
            this.ship.y,
            0,
            4,
            0x00ff00
        );
        laser.setOrigin(0, 0.5);
        
        const angle = Phaser.Math.Angle.Between(
            this.ship.x,
            this.ship.y,
            this.asteroid.x,
            this.asteroid.y
        );
        laser.setRotation(angle);
        
        const distance = Phaser.Math.Distance.Between(
            this.ship.x,
            this.ship.y,
            this.asteroid.x,
            this.asteroid.y
        );
        
        this.tweens.add({
            targets: laser,
            width: distance,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.hitAsteroid();
                
                this.tweens.add({
                    targets: laser,
                    alpha: 0,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        laser.destroy();
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    hitAsteroid() {
        this.asteroidHits++;
        console.log(`Asteroid hit! Total hits: ${this.asteroidHits}`);
        
        this.tweens.add({
            targets: this.asteroid,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 1
        });
        
        this.tweens.add({
            targets: this.asteroid,
            scaleX: this.asteroid.scaleX * 0.95,
            scaleY: this.asteroid.scaleY * 0.95,
            duration: 100
        });
        
        this.createImpactParticles(this.asteroid.x, this.asteroid.y);
    }

    createImpactParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 30;
            
            const particle = this.add.circle(x, y, 3, 0xff6600);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 400,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    explodeAsteroid() {
        console.log('Asteroid exploding!');
        
        if (!this.asteroid) return;
        
        const numChunks = 12;
        for (let i = 0; i < numChunks; i++) {
            const angle = (i / numChunks) * Math.PI * 2;
            const distance = Phaser.Math.Between(100, 200);
            
            const size = Phaser.Math.Between(8, 15);
            const chunk = this.add.circle(
                this.asteroid.x,
                this.asteroid.y,
                size,
                0x808080
            );
            
            const rotationSpeed = Phaser.Math.Between(-10, 10);
            
            this.tweens.add({
                targets: chunk,
                x: this.asteroid.x + Math.cos(angle) * distance,
                y: this.asteroid.y + Math.sin(angle) * distance,
                alpha: 0,
                angle: rotationSpeed * 360,
                duration: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => chunk.destroy()
            });
        }
        
        const flash = this.add.circle(this.asteroid.x, this.asteroid.y, 50, 0xffff00, 0.8);
        this.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });
        
        this.asteroid.destroy();
        this.asteroid = null;
    }

    update() {
        this.background.tilePositionX += 2;
        
        if (this.asteroid) {
            this.asteroid.y = this.asteroid.y + Math.sin(this.time.now / 1000) * 0.3;
            this.asteroid.angle += 0.2;
        }
    }

    trackGameStart() {
        fetch('https://api.countapi.xyz/hit/newton-game/level1-starts')
            .then(res => res.json())
            .then(data => console.log('Game starts:', data.value))
            .catch(err => console.log('Analytics unavailable'));
    }

    trackLevelComplete() {
        fetch('https://api.countapi.xyz/hit/newton-game/level1-completions')
            .then(res => res.json())
            .then(data => console.log('Level completions:', data.value))
            .catch(err => console.log('Analytics unavailable'));
    }
}