/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */

export class Level4 extends Phaser.Scene {

    constructor() {
        super('Level4');
        console.log('Level4 constructor called');
    }

    preload() {
        console.log('Level4 preload started');
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
        console.log('Level4 preload complete');
    }

    create() {
        console.log('Level4 create started');

        // Track game start
        this.trackGameStart();

        // Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');

        // Create animation
        if (!this.anims.exists('fly')) {
            this.anims.create({
                key: 'fly',
                frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: -1
            });
        }

        // Animated ship
        this.ship = this.add.sprite(640, 360, 'ship');
        this.ship.play('fly');

        // ------------------------------------------------
        // LEVEL 4 INTRO TEXT
        // ------------------------------------------------
        const levelText = "LEVEL 4 - Splitsen!\n\nLeer getallen splitsen.\nJe ziet het getal bovenaan, en één deel is ingevuld.\nVul het ontbrekende deel in!\n\nGebruik cijfertoetsen en druk op [ENTER].\n[BACKSPACE] om te wissen | [ESC] voor menu\n\nDruk op [ENTER] om te starten!";

        this.levelText = this.add.text(640, 100, levelText, {
            fontSize: '26px',
            color: '#00ff00',
            align: 'center',
            wordWrap: { width: 1100 }
        }).setOrigin(0.5, 0);

        // Game state variables
        this.topNumber = 0;          // The total number to split
        this.leftNumber = 0;         // The given part
        this.rightNumber = 0;        // The answer (what they need to find)
        this.playerInput = '';
        this.inputDisplay = null;
        this.score = 0;
        this.scoreText = null;
        this.targetScore = 10;
        this.inputEnabled = false;
        
        // Visual elements
        this.topAsteroid = null;
        this.leftAsteroid = null;
        this.rightAsteroid = null;
        this.topNumberText = null;
        this.leftNumberText = null;
        this.instructionText = null;
        this.splitLines = [];

        // Setup keyboard listeners
        this.setupKeyboardListeners();

        console.log('Level4 create complete');
    }

    setupKeyboardListeners() {
        // ENTER to start or submit
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.levelText) {
                console.log('ENTER pressed - starting game');
                this.levelText.destroy();
                this.levelText = null;
                this.showSplitProblem();
            } else if (this.inputEnabled) {
                this.submitAnswer();
            }
        });

        // ESC to return to menu
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC pressed - returning to Start');
            this.scene.start('Start');
        });

        // Number keys
        this.input.keyboard.on('keydown', (event) => {
            if (this.inputEnabled && !this.levelText) {
                const key = event.key;
                
                // Numbers
                if (key >= '0' && key <= '9' && !event.code.startsWith('Numpad')) {
                    this.onNumberPressed(parseInt(key));
                }
                
                // Backspace
                if (key === 'Backspace' || key === 'Delete') {
                    if (this.playerInput.length > 0) {
                        this.playerInput = this.playerInput.slice(0, -1);
                        this.inputDisplay.setText(this.playerInput || '?');
                    }
                }
            }
        });

        // Numpad
        const numpadKeys = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        numpadKeys.forEach((keyName, index) => {
            this.input.keyboard.on(`keydown-NUMPAD_${keyName}`, () => {
                if (this.inputEnabled && !this.levelText) {
                    this.onNumberPressed(index);
                }
            });
        });
    }

    generateSplitProblem() {
        // Generate a number to split (1-20 for easier learning)
        this.topNumber = Phaser.Math.Between(1, 20);
        
        // Generate the left part (at least 1, leave at least 1 for right)
        this.leftNumber = Phaser.Math.Between(1, this.topNumber - 1);
        
        // Calculate the answer
        this.rightNumber = this.topNumber - this.leftNumber;
        
        console.log(`Split problem: ${this.topNumber} = ${this.leftNumber} + ${this.rightNumber}`);
    }

    showSplitProblem() {
        // Reset input
        this.playerInput = '';
        this.inputEnabled = true;
        
        // Generate problem
        this.generateSplitProblem();
        
        // Create score if needed
        if (!this.scoreText) {
            this.scoreText = this.add.text(640, 50, `Score: ${this.score} / ${this.targetScore}`, {
                fontSize: '36px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }
        
        // Create three asteroids in a triangle formation
        if (!this.topAsteroid) {
            // Top asteroid (the total)
            this.topAsteroid = this.add.image(640, 200, 'asteroid');
            this.topAsteroid.setScale(0.25);
            
            // Left asteroid (given number)
            this.leftAsteroid = this.add.image(450, 450, 'asteroid');
            this.leftAsteroid.setScale(0.20);
            
            // Right asteroid (answer - what they fill in)
            this.rightAsteroid = this.add.image(830, 450, 'asteroid');
            this.rightAsteroid.setScale(0.20);
            
            // Draw split lines from top to bottom asteroids
            const lineStyle = { lineStyle: { width: 3, color: 0x00ff00 } };
            
            // Line to left asteroid
            const leftLine = this.add.graphics();
            leftLine.lineStyle(3, 0x00ff00, 0.8);
            leftLine.beginPath();
            leftLine.moveTo(640, 230);
            leftLine.lineTo(450, 420);
            leftLine.strokePath();
            this.splitLines.push(leftLine);
            
            // Line to right asteroid
            const rightLine = this.add.graphics();
            rightLine.lineStyle(3, 0x00ff00, 0.8);
            rightLine.beginPath();
            rightLine.moveTo(640, 230);
            rightLine.lineTo(830, 420);
            rightLine.strokePath();
            this.splitLines.push(rightLine);
        }
        
        // Update numbers on asteroids
        if (this.topNumberText) {
            this.topNumberText.setText(this.topNumber.toString());
        } else {
            this.topNumberText = this.add.text(640, 200, this.topNumber.toString(), {
                fontSize: '56px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }).setOrigin(0.5);
        }
        
        if (this.leftNumberText) {
            this.leftNumberText.setText(this.leftNumber.toString());
        } else {
            this.leftNumberText = this.add.text(450, 450, this.leftNumber.toString(), {
                fontSize: '48px',
                color: '#ffff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5);
        }
        
        // Input display on right asteroid
        if (this.inputDisplay) {
            this.inputDisplay.setText('?');
            this.inputDisplay.setColor('#ffff00');
            this.inputDisplay.setAlpha(1);
        } else {
            this.inputDisplay = this.add.text(830, 450, '?', {
                fontSize: '48px',
                color: '#ffff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5);
        }
        
        // Instruction text
        if (!this.instructionText) {
            this.instructionText = this.add.text(640, 580, `${this.topNumber} = ${this.leftNumber} + ?`, {
                fontSize: '32px',
                color: '#aaaaaa',
                align: 'center'
            }).setOrigin(0.5);
        } else {
            this.instructionText.setText(`${this.topNumber} = ${this.leftNumber} + ?`);
        }
    }

    onNumberPressed(num) {
        if (this.playerInput.length < 2) {
            this.playerInput += num.toString();
            this.inputDisplay.setText(this.playerInput);
            
            // Visual feedback
            this.tweens.add({
                targets: this.inputDisplay,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    submitAnswer() {
        if (this.playerInput === '') {
            return;
        }

        const playerAnswer = parseInt(this.playerInput);
        console.log(`Player: ${playerAnswer}, Correct: ${this.rightNumber}`);

        if (playerAnswer === this.rightNumber) {
            // CORRECT!
            this.score++;
            this.scoreText.setText(`Score: ${this.score} / ${this.targetScore}`);

            this.disableInput();
            this.correctAnswerCelebration();
            
            if (this.score >= this.targetScore) {
                this.time.delayedCall(2000, () => {
                    this.levelComplete();
                });
            } else {
                this.time.delayedCall(1500, () => {
                    this.enableInput();
                    this.showSplitProblem();
                });
            }
        } else {
            // WRONG
            this.disableInput();
            this.wrongAnswerAnimation();
            
            this.time.delayedCall(1500, () => {
                this.inputDisplay.setColor('#ffff00');
                this.playerInput = '';
                this.inputDisplay.setText('?');
                this.enableInput();
            });
        }
    }

    correctAnswerCelebration() {
        // Flash correct answer green
        this.inputDisplay.setColor('#00ff00');
        
        // Pulse animation
        this.tweens.add({
            targets: this.inputDisplay,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            repeat: 2
        });
        
        // Praise text
        const praises = ['SUPER!', 'GEWELDIG!', 'PERFECT!', 'TOP!', 'GOED ZO!'];
        const praise = Phaser.Math.RND.pick(praises);
        
        const praiseText = this.add.text(640, 350, praise, {
            fontSize: '64px',
            color: '#6fdd86',
            fontStyle: 'bold'
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
                    duration: 400,
                    delay: 300,
                    onComplete: () => praiseText.destroy()
                });
            }
        });
        
        // Asteroids glow
        [this.topAsteroid, this.leftAsteroid, this.rightAsteroid].forEach(asteroid => {
            this.tweens.add({
                targets: asteroid,
                alpha: 0.3,
                duration: 150,
                yoyo: true,
                repeat: 2
            });
        });
        
        // Ship spins happily
        this.tweens.add({
            targets: this.ship,
            angle: 360,
            duration: 800,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                this.ship.angle = 0;
            }
        });
    }

    wrongAnswerAnimation() {
        // Red flash
        this.inputDisplay.setColor('#ff0000');
        
        const wrongText = this.add.text(640, 350, 'PROBEER OPNIEUW!', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: wrongText,
            alpha: 0,
            duration: 300,
            delay: 800,
            onComplete: () => wrongText.destroy()
        });
        
        // Ship gets hit
        const originalX = this.ship.x;
        const originalY = this.ship.y;
        
        this.tweens.add({
            targets: this.ship,
            x: originalX - 30,
            y: originalY + 20,
            angle: -15,
            duration: 150,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                this.ship.x = originalX;
                this.ship.y = originalY;
                this.ship.angle = 0;
            }
        });
    }

    levelComplete() {
        console.log('Level 4 Complete!');
        this.trackLevelComplete();

        // All three asteroids explode!
        [this.topAsteroid, this.leftAsteroid, this.rightAsteroid].forEach((asteroid, index) => {
            this.time.delayedCall(index * 300, () => {
                this.explodeAsteroid(asteroid);
            });
        });

        const victoryText = this.add.text(640, 360, 'LEVEL VOLTOOID!\n🌟🌟🌟', {
            fontSize: '64px',
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

        this.time.delayedCall(3000, () => {
            this.scene.start('Start');
        });
    }

    explodeAsteroid(asteroid) {
        if (!asteroid) return;
        
        const x = asteroid.x;
        const y = asteroid.y;
        
        // Explosion chunks
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = Phaser.Math.Between(80, 150);
            const chunk = this.add.circle(x, y, Phaser.Math.Between(5, 10), 0x808080);
            
            this.tweens.add({
                targets: chunk,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 800,
                onComplete: () => chunk.destroy()
            });
        }
        
        // Flash
        const flash = this.add.circle(x, y, 40, 0xffff00, 0.8);
        this.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy()
        });
        
        asteroid.destroy();
    }

    disableInput() {
        this.inputEnabled = false;
        if (this.inputDisplay) {
            this.inputDisplay.setAlpha(0.5);
        }
    }

    enableInput() {
        this.inputEnabled = true;
        if (this.inputDisplay) {
            this.inputDisplay.setAlpha(1);
        }
    }

    update() {
        this.background.tilePositionX += 2;
        
        // Gentle floating for asteroids
        if (this.topAsteroid) {
            this.topAsteroid.angle += 0.3;
        }
        if (this.leftAsteroid) {
            this.leftAsteroid.angle += 0.2;
        }
        if (this.rightAsteroid) {
            this.rightAsteroid.angle += 0.25;
        }
    }

    trackGameStart() {
        fetch('https://api.countapi.xyz/hit/newton-game/level4-starts')
            .then(res => res.json())
            .then(data => console.log('Level 4 starts:', data.value))
            .catch(err => console.log('Analytics unavailable'));
    }

    trackLevelComplete() {
        fetch('https://api.countapi.xyz/hit/newton-game/level3-completions')
            .then(res => res.json())
            .then(data => console.log('Level 4 completions:', data.value))
            .catch(err => console.log('Analytics unavailable'));
    }
}