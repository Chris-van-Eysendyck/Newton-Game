/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */

export class Level2 extends Phaser.Scene {

    constructor() {
        super('Level2');
        console.log('Level2 constructor called');
    }

    preload() {
        console.log('Level2 preload started');
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
        // Load asteroid
        if (!this.textures.exists('asteroid')) {
            this.load.image('asteroid', 'assets/Asteroid2.png');
        }
        console.log('Level2 preload complete');
    }

    create() {
        console.log('Level2 create started');

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

        // Add floating asteroid on the right side
        this.asteroid = this.add.image(950, 350, 'asteroid');
        this.asteroid.setScale(0.3);
        console.log('Asteroid created');

        // ------------------------------------------------
        // LEVEL 1 INTRO TEXT
        // ------------------------------------------------
        const levelText = "LEVEL 2 - Welkom Kapitein!\n\nGebruik de cijfertoetsen (0-9) of numpad om te antwoorden.\nDruk op [ENTER] om je antwoord in te dienen.\nDruk op [BACKSPACE] om te wissen.\n\nDruk op [ENTER] om te starten of [ESC] om terug te gaan naar het menu.";

        this.levelText = this.add.text(640, 120, levelText, {
            fontSize: '28px',
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
        this.instructionText = null;
        this.currentAnswer = null;
        this.score = 0;
        this.scoreText = null;
        this.targetScore = 10;  // Win condition
        this.inputEnabled = false;  // Track if input is enabled
        this.asteroidHits = 0;  // Track how many times asteroid has been hit

        // Setup keyboard listeners
        this.setupKeyboardListeners();

        console.log('Level2 create complete');
    }

    setupKeyboardListeners() {
        // ENTER to start playing or submit answer
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.levelText) {
                console.log('ENTER pressed - starting game');
                this.levelText.destroy();
                this.levelText = null;
                this.showMathProblem();
            } else if (this.mathProblemText && this.inputEnabled) {
                // If already in game, ENTER submits the answer
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
                // Get the actual key pressed (works with or without shift/caps)
                const key = event.key;
                
                // Check if it's a number (0-9)
                if (key >= '0' && key <= '9') {
                    this.onNumberPressed(parseInt(key));
                    console.log(`Number key detected: ${key}`);
                }
            }
        });

        // Numpad keys (for keyboards with separate numpad)
        const numpadKeys = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        numpadKeys.forEach((keyName, index) => {
            this.input.keyboard.on(`keydown-NUMPAD_${keyName}`, () => {
                if (this.mathProblemText && !this.levelText && this.inputEnabled) {
                    this.onNumberPressed(index);
                }
            });
        });

        // BACKSPACE or DELETE to clear input
        this.input.keyboard.on('keydown-BACKSPACE', () => {
            if (this.mathProblemText && !this.levelText && this.inputEnabled) {
                this.clearInput();
            }
        });

        this.input.keyboard.on('keydown-DELETE', () => {
            if (this.mathProblemText && !this.levelText && this.inputEnabled) {
                this.clearInput();
            }
        });
    }

    // Generate a random math problem (+ or -, result max 10)
    generateMathProblem() {
        const operators = ['+', '-'];
        const operator = Phaser.Math.RND.pick(operators);
        
        let num1, num2, answer;
        
        if (operator === '+') {
            // For addition: ensure sum doesn't exceed 10
            num1 = Phaser.Math.Between(0, 20);
            num2 = Phaser.Math.Between(0, 20 - num1);
            answer = num1 + num2;
            console.log(`Generated ADDITION: ${num1} + ${num2} = ${answer}`);
        } else {
            // For subtraction: ensure result is not negative
            num1 = Phaser.Math.Between(1, 20);
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
        this.inputEnabled = true;
        
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
            this.inputDisplay.setColor('#ffff00');
            this.inputDisplay.setAlpha(1);
        } else {
            this.inputDisplay = this.add.text(280, 340, '__', {
                fontSize: '40px',
                color: '#ffff00',
                fontStyle: 'bold',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        // Add instruction text
        if (!this.instructionText) {
            this.instructionText = this.add.text(280, 420, 'Typ je antwoord en druk op [ENTER]', {
                fontSize: '20px',
                color: '#aaaaaa',
                align: 'center'
            }).setOrigin(0.5);
        }
        
        console.log(`Math problem: ${problem.question} (Answer: ${problem.answer})`);
    }

    onNumberPressed(num) {
        // Limit input to 2 digits (0-10)
        if (this.playerInput.length < 2) {
            this.playerInput += num.toString();
            this.inputDisplay.setText(this.playerInput || '__');
            console.log('Input:', this.playerInput);
            
            // Visual feedback - briefly scale up
            this.tweens.add({
                targets: this.inputDisplay,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    clearInput() {
        this.playerInput = '';
        this.inputDisplay.setText('__');
        console.log('Input cleared');
        
        // Visual feedback
        this.tweens.add({
            targets: this.inputDisplay,
            alpha: 0.5,
            duration: 100,
            yoyo: true
        });
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
            this.disableInput();
            
            // Fire laser at asteroid!
            this.fireLaser();
            
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
                    this.enableInput();
                    this.showMathProblem();
                });
            }
            
        } else {
            // WRONG ANSWER
            console.log('Wrong answer!');
            
            // Disable input during wrong answer animation
            this.disableInput();
            
            // Flash red
            this.inputDisplay.setColor('#ff0000');
            
            // Show "OEPS!" or "PROBEER OPNIEUW!" text
            const wrongMessages = ['OEPS!', 'PROBEER OPNIEUW!', 'NIET JUIST!', 'HELAAS!'];
            const message = Phaser.Math.RND.pick(wrongMessages);
            
            const wrongText = this.add.text(640, 200, message, {
                fontSize: '64px',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            // Shake text
            this.tweens.add({
                targets: wrongText,
                x: 640 + 10,
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
            
            // Red screen flash
            const redFlash = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0.3);
            this.tweens.add({
                targets: redFlash,
                alpha: 0,
                duration: 500,
                onComplete: () => redFlash.destroy()
            });
            
            // Wrong answer animation (ship gets hit)
            this.wrongAnswerAnimation();
            
            // Clear input after delay and re-enable
            this.time.delayedCall(1500, () => {
                this.inputDisplay.setColor('#ffff00');
                this.clearInput();
                this.enableInput();
            });
        }
    }

    levelComplete() {
        console.log('Level 1 Complete!');

        // Final laser shot to destroy asteroid completely
        this.fireLaser(() => {
            // After laser hits, explode the asteroid
            this.explodeAsteroid();
        });

        this.createFireworks();

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

        const flash = this.add.rectangle(640, 360, 1280, 720, 0xffd700, 0.4);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 1000
        });

        // Return to main menu after celebration
        this.time.delayedCall(3000, () => {
            this.scene.start('Start');
        });
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

    wrongAnswerAnimation() {
        // Ship gets "hit" and loses control temporarily
        console.log('Ship hit by wrong answer!');
        
        // Save original position
        const originalX = this.ship.x;
        const originalY = this.ship.y;
        
        // 1. Ship spins and moves erratically
        this.tweens.add({
            targets: this.ship,
            angle: -30,
            x: originalX - 80,
            y: originalY + 50,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                // Continue spinning the other way
                this.tweens.add({
                    targets: this.ship,
                    angle: 30,
                    x: originalX + 80,
                    y: originalY - 50,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        // Return to position
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
        
        // 2. Create impact sparks/smoke at ship location
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
        
        // 3. Ship flashes red (damage indicator)
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
        
        // Create laser beam (a rectangle that grows from ship to asteroid)
        const laser = this.add.rectangle(
            this.ship.x,
            this.ship.y,
            0,
            4,
            0x00ff00
        );
        laser.setOrigin(0, 0.5);
        
        // Calculate angle to asteroid
        const angle = Phaser.Math.Angle.Between(
            this.ship.x,
            this.ship.y,
            this.asteroid.x,
            this.asteroid.y
        );
        laser.setRotation(angle);
        
        // Calculate distance
        const distance = Phaser.Math.Distance.Between(
            this.ship.x,
            this.ship.y,
            this.asteroid.x,
            this.asteroid.y
        );
        
        // Animate laser extending
        this.tweens.add({
            targets: laser,
            width: distance,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                // Hit the asteroid!
                this.hitAsteroid();
                
                // Flash the laser
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
        
        // Flash white
        this.tweens.add({
            targets: this.asteroid,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 1
        });
        
        // Shake and shrink slightly
        this.tweens.add({
            targets: this.asteroid,
            scaleX: this.asteroid.scaleX * 0.95,
            scaleY: this.asteroid.scaleY * 0.95,
            duration: 100
        });
        
        // Impact particles
        this.createImpactParticles(this.asteroid.x, this.asteroid.y);
    }

    createImpactParticles(x, y) {
        // Create small debris particles
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
        
        // Create explosion effect - multiple chunks flying outward
        const numChunks = 12;
        for (let i = 0; i < numChunks; i++) {
            const angle = (i / numChunks) * Math.PI * 2;
            const distance = Phaser.Math.Between(100, 200);
            
            // Create chunk (small circle representing asteroid piece)
            const size = Phaser.Math.Between(8, 15);
            const chunk = this.add.circle(
                this.asteroid.x,
                this.asteroid.y,
                size,
                0x808080
            );
            
            // Add some rotation
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
        
        // Bright flash at asteroid location
        const flash = this.add.circle(this.asteroid.x, this.asteroid.y, 50, 0xffff00, 0.8);
        this.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });
        
        // Remove the asteroid
        this.asteroid.destroy();
        this.asteroid = null;
    }

    update() {
        this.background.tilePositionX += 2;
        
        // Make asteroid float gently
        if (this.asteroid) {
            this.asteroid.y = 350 + Math.sin(this.time.now / 1000) * 20;
            this.asteroid.angle += 0.2;
        }
    }
}