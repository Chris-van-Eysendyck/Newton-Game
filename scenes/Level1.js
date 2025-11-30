/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
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
        // Load the math problem background
        if (!this.textures.exists('mathBg')) {
            this.load.image('mathBg', 'assets/Newton_menu_background_small.jpg');
        }
        console.log('Level1 preload complete');
    }

    create() {
        console.log('Level1 create started');

        // Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');
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

        // Animated ship
        this.ship = this.add.sprite(640, 360, 'ship');
        this.ship.play('fly');
        console.log('Ship created and animated');

        // ------------------------------------------------
        // LEVEL 1 INTRO TEXT
        // ------------------------------------------------
        const levelText = "LEVEL 1 - Welkom Kapitein!\n\nDruk op [ENTER] om te starten of [ESC] om terug te gaan naar het menu.";

        this.levelText = this.add.text(640, 120, levelText, {
            fontSize: '32px',
            color: '#00ff00',
            align: 'center',
            wordWrap: { width: 1100 }
        }).setOrigin(0.5, 0);
        
        console.log('Text created');

        // Game state variables
        this.mathPanel = null;
        this.mathProblemText = null;
        this.playerInput = '';
        this.inputDisplay = null;
        this.numberButtons = [];
        this.currentAnswer = null;
        this.score = 0;
        this.scoreText = null;
        this.targetScore = 5;  // Win condition

        // ENTER to start playing (removes intro text and shows math)
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.levelText) {
                console.log('ENTER pressed - starting game');
                this.levelText.destroy();
                this.levelText = null;
                this.showMathProblem();
            }
        });

        // ESC to return to menu
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC pressed - returning to Start');
            this.scene.start('Start');
        });

        console.log('Level1 create complete');
    }

    // Generate a random math problem (+ or -, result max 10)
    generateMathProblem() {
        const operators = ['+', '-'];
        const operator = Phaser.Math.RND.pick(operators);
        
        let num1, num2, answer;
        
        if (operator === '+') {
            // For addition: ensure sum doesn't exceed 10
            num1 = Phaser.Math.Between(0, 10);
            num2 = Phaser.Math.Between(0, 10 - num1);
            answer = num1 + num2;
            console.log(`Generated ADDITION: ${num1} + ${num2} = ${answer}`);
        } else {
            // For subtraction: ensure result is not negative
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
        // Reset player input
        this.playerInput = '';
        
        // Create background panel on the LEFT side
        if (!this.mathPanel) {
            this.mathPanel = this.add.image(280, 300, 'mathBg');
            this.mathPanel.setScale(0.5);
            this.mathPanel.setAlpha(0.9);
        }
        
        // Create score counter if it doesn't exist
        if (!this.scoreText) {
            this.scoreText = this.add.text(640, 50, `Score: ${this.score} / ${this.targetScore}`, {
                fontSize: '36px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }
        
        // Generate random math problem
        const problem = this.generateMathProblem();
        this.currentAnswer = problem.answer;
        
        // Display the math problem on the panel (LEFT)
        if (this.mathProblemText) {
            this.mathProblemText.setText(problem.question);
        } else {
            this.mathProblemText = this.add.text(280, 280, problem.question, {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        // Display player input area (LEFT)
        if (this.inputDisplay) {
            this.inputDisplay.setText('__');
        } else {
            this.inputDisplay = this.add.text(280, 340, '__', {
                fontSize: '40px',
                color: '#ffff00',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        // Create number pad on the RIGHT if it doesn't exist
        if (this.numberButtons.length === 0) {
            this.createNumberPad();
        }
        
        console.log(`Math problem: ${problem.question} (Answer: ${problem.answer})`);
    }

    createNumberPad() {
        const buttonStyle = {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        };

        const numbers = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
            [null, 0, null]  // null for empty spaces
        ];

        // Position number pad on the RIGHT side
        const startX = 900;
        const startY = 280;
        const spacing = 80;

        // Create number buttons
        numbers.forEach((row, rowIndex) => {
            row.forEach((num, colIndex) => {
                if (num !== null) {
                    const x = startX + colIndex * spacing;
                    const y = startY + rowIndex * spacing;
                    
                    const button = this.add.text(x, y, num.toString(), buttonStyle)
                        .setOrigin(0.5)
                        .setInteractive({ useHandCursor: true })
                        .on('pointerover', function() {
                            this.setStyle({ color: '#ffff00' });
                        })
                        .on('pointerout', function() {
                            this.setStyle({ color: '#ffffff' });
                        })
                        .on('pointerdown', () => {
                            this.onNumberPressed(num);
                        });
                    
                    this.numberButtons.push(button);
                }
            });
        });

        // Create CLEAR button (bottom left of pad)
        const clearButton = this.add.text(startX - spacing, startY + 3 * spacing, 'C', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function() {
                this.setStyle({ color: '#ff6666' });
            })
            .on('pointerout', function() {
                this.setStyle({ color: '#ffffff' });
            })
            .on('pointerdown', () => {
                this.clearInput();
            });
        
        this.numberButtons.push(clearButton);

        // Create SUBMIT button (bottom right of pad)
        const submitButton = this.add.text(startX + 2 * spacing, startY + 3 * spacing, 'OK', buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function() {
                this.setStyle({ color: '#66ff66' });
            })
            .on('pointerout', function() {
                this.setStyle({ color: '#ffffff' });
            })
            .on('pointerdown', () => {
                this.submitAnswer();
            });
        
        this.numberButtons.push(submitButton);
    }

    onNumberPressed(num) {
        // Limit input to 2 digits (0-10)
        if (this.playerInput.length < 2) {
            this.playerInput += num.toString();
            this.inputDisplay.setText(this.playerInput || '__');
            console.log('Input:', this.playerInput);
        }
    }

    clearInput() {
        this.playerInput = '';
        this.inputDisplay.setText('__');
        console.log('Input cleared');
    }

    submitAnswer() {
        if (this.playerInput === '') {
            console.log('No input to submit');
            return;
        }

        const playerAnswer = parseInt(this.playerInput);
        console.log(`Player answered: ${playerAnswer}, Correct answer: ${this.currentAnswer}`);

        if (playerAnswer === this.currentAnswer) {
            // CORRECT ANSWER - CELEBRATION TIME! 🎉
            this.score++;
            console.log('Correct! Score:', this.score);
            
            // Update score display
            this.scoreText.setText(`Score: ${this.score} / ${this.targetScore}`);
            
            // Score text pulse
            this.tweens.add({
                targets: this.scoreText,
                scale: 1.3,
                duration: 200,
                yoyo: true
            });
            
            // Disable input during celebration
            this.disableNumberPad();
            
            // Multiple celebration effects
            this.correctAnswerCelebration();
            
            // Check if level complete
            if (this.score >= this.targetScore) {
                this.time.delayedCall(2000, () => {
                    this.levelComplete();
                });
            } else {
                // Show next problem after celebration
                this.time.delayedCall(1500, () => {
                    this.enableNumberPad();
                    this.showMathProblem();
                });
            }
            
        } else {
            // WRONG ANSWER
            console.log('Wrong answer!');
            
            // Flash red
            this.inputDisplay.setColor('#ff0000');
            
            // Wrong answer animation
            this.wrongAnswerAnimation();
            
            // Clear input after delay
            this.time.delayedCall(1000, () => {
                this.inputDisplay.setColor('#ffff00');
                this.clearInput();
            });
        }
    }

    levelComplete() {
        console.log('Level 1 Complete!');
        
        // OPTION 1: Fireworks Explosion
        this.createFireworks();
        
        // OPTION 2: Flying Stars
        // this.createFlyingStars();
        
        // OPTION 3: Spinning Rockets
        // this.createSpinningRockets();
        
        // Big celebration message
        const victoryText = this.add.text(640, 360, 'LEVEL VOLTOOID!\n🌟🌟🌟', {
            fontSize: '64px',
            color: '#6fdd86',
            fontStyle: 'bold',
            stroke: '#ff00ff',
            strokeThickness: 0,
            align: 'center'
        }).setOrigin(0.5);
        
        // Victory animation
        victoryText.setScale(0);
        this.tweens.add({
            targets: victoryText,
            scale: 1.2,
            duration: 600,
            ease: 'Back.easeOut'
        });
        
        // Screen flash gold
        const flash = this.add.rectangle(640, 360, 1280, 720, 0xffd700, 0.4);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 1000
        });
        
        // TODO: Transition to Level 2 (for next session)
        // this.time.delayedCall(3000, () => {
        //     this.scene.start('Level2');
        // });
    }

    // OPTION 1: Multiple firework bursts
    createFireworks() {
        const positions = [
            { x: 320, y: 200 },
            { x: 640, y: 150 },
            { x: 960, y: 200 },
            { x: 400, y: 500 },
            { x: 880, y: 500 }
        ];
        
        positions.forEach((pos, index) => {
            this.time.delayedCall(index * 200, () => {
                // Create burst of particles
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

    // OPTION 2: Stars flying across screen
    createFlyingStars() {
        for (let i = 0; i < 30; i++) {
            this.time.delayedCall(i * 100, () => {
                const startY = Phaser.Math.Between(100, 620);
                const star = this.add.text(-50, startY, '⭐', {
                    fontSize: '48px'
                });
                
                this.tweens.add({
                    targets: star,
                    x: 1330,
                    duration: 2000,
                    ease: 'Linear',
                    onComplete: () => star.destroy()
                });
                
                // Rotate while flying
                this.tweens.add({
                    targets: star,
                    angle: 360,
                    duration: 1000,
                    repeat: 1
                });
            });
        }
    }

    // OPTION 3: Spinning rockets around the ship
    createSpinningRockets() {
        const rocketSymbols = ['🚀', '🛸', '✨', '💫'];
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 150;
            const symbol = Phaser.Math.RND.pick(rocketSymbols);
            
            const rocket = this.add.text(
                640 + Math.cos(angle) * radius,
                360 + Math.sin(angle) * radius,
                symbol,
                { fontSize: '48px' }
            ).setOrigin(0.5);
            
            // Orbit animation
            this.tweens.add({
                targets: rocket,
                angle: 360,
                duration: 2000,
                ease: 'Linear',
                repeat: 2,
                onUpdate: () => {
                    const currentAngle = angle + Phaser.Math.DegToRad(rocket.angle);
                    rocket.x = 640 + Math.cos(currentAngle) * radius;
                    rocket.y = 360 + Math.sin(currentAngle) * radius;
                },
                onComplete: () => {
                    // Fly away
                    this.tweens.add({
                        targets: rocket,
                        x: rocket.x + Math.cos(angle) * 500,
                        y: rocket.y + Math.sin(angle) * 500,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => rocket.destroy()
                    });
                }
            });
        }
    }

    correctAnswerCelebration() {
        // 1. Flash the answer GREEN with pulse
        this.inputDisplay.setColor('#00ff00');
        this.tweens.add({
            targets: this.inputDisplay,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            repeat: 2
        });

        // 2. Show "SUPER!" or "GEWELDIG!" text
        const praises = ['SUPER!', 'GEWELDIG!', 'FANTASTISCH!', 'TOP!', 'PERFECT!', 'GOED ZO!'];
        const praise = Phaser.Math.RND.pick(praises);
        
        const praiseText = this.add.text(640, 200, praise, {
            fontSize: '72px',
            color: '#6fdd86',
            fontStyle: 'bold',
            stroke: '#ff00ff',
            strokeThickness: 0
        }).setOrigin(0.5);
        
        // Praise text bounces in
        praiseText.setScale(0);
        this.tweens.add({
            targets: praiseText,
            scale: 1.2,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Then fade out
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

        // 3. Sparkle particles around the answer
        this.createSparkles(280, 340);

        // 4. Ship does a happy spin
        this.tweens.add({
            targets: this.ship,
            angle: 360,
            duration: 800,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                this.ship.angle = 0;
            }
        });

        // 5. Screen flash (subtle)
        const flash = this.add.rectangle(640, 360, 1280, 720, 0xffff00, 0.3);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });

        // 6. Math panel bounces
        this.tweens.add({
            targets: this.mathPanel,
            scaleX: 0.55,
            scaleY: 0.55,
            duration: 150,
            yoyo: true,
            repeat: 1
        });
    }

    createSparkles(x, y) {
        // Create multiple star/sparkle effects
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

    disableNumberPad() {
        this.numberButtons.forEach(button => {
            button.disableInteractive();
            button.setAlpha(0.5);
        });
    }

    enableNumberPad() {
        this.numberButtons.forEach(button => {
            button.setInteractive();
            button.setAlpha(1);
        });
    }

    wrongAnswerAnimation() {
        // Placeholder - shake the ship
        this.tweens.add({
            targets: this.ship,
            x: 640 + 10,
            duration: 70,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.ship.x = 640;
            }
        });
        
    }

    update() {
        this.background.tilePositionX += 2;
    }
}