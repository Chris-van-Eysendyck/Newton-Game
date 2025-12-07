/**
 * ASTEROID BONUS STAGE
 * Players shoot 5 asteroids as a reward after Level 1
 */

export class AsteroidBonus extends Phaser.Scene {

    constructor() {
        super('AsteroidBonus');
    }

    preload() {
        this.load.image('asteroid', 'assets/Asteroid.png');   // Add an asteroid PNG
        this.load.image('laser', 'assets/Laser.png');         // Add a laser PNG
        this.load.spritesheet('ship', 'assets/spaceship.png', {
            frameWidth: 176,
            frameHeight: 96
        });
        this.load.image('background', 'assets/space.png');
    }

    create() {
        // Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'background');

        // Create animation (same as other scenes)
        if (!this.anims.exists('fly')) {
            this.anims.create({
                key: 'fly',
                frames: this.anims.generateFrameNumbers('ship', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: -1
            });
        }

        // Ship
        this.ship = this.physics.add.sprite(640, 600, 'ship');
        this.ship.play('fly');
        this.ship.setCollideWorldBounds(true);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Groups
        this.lasers = this.physics.add.group();
        this.asteroids = this.physics.add.group();

        // Spawn asteroids every 1 sec
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnAsteroid,
            callbackScope: this,
            loop: true
        });

        // Collision: laser hits asteroid
        this.physics.add.overlap(this.lasers, this.asteroids, this.hitAsteroid, null, this);

        // HUD
        this.kills = 0;
        this.targetKills = 5;

        this.killText = this.add.text(640, 50, 'Asteroids destroyed: 0 / 5', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Intro text
        this.add.text(640, 150, "BONUS LEVEL!\nVernietig 5 asteroïden!",
            { fontSize: '42px', color: '#ffff66', align: 'center' }
        ).setOrigin(0.5);
    }

    spawnAsteroid() {
        const x = Phaser.Math.Between(100, 1180);
        const asteroid = this.physics.add.sprite(x, -50, 'asteroid');

        asteroid.setVelocityY(150);
        asteroid.setScale(Phaser.Math.FloatBetween(0.5, 1.2));

        this.asteroids.add(asteroid);

        // Destroy if it goes off-screen
        asteroid.setCollideWorldBounds(false);
        asteroid.outOfBoundsKill = true;
    }

    shootLaser() {
        const laser = this.physics.add.sprite(this.ship.x, this.ship.y - 40, 'laser');
        laser.setVelocityY(-500);

        this.lasers.add(laser);
    }

    hitAsteroid(laser, asteroid) {
        laser.destroy();
        asteroid.destroy();

        this.kills++;

        this.killText.setText(`Asteroids destroyed: ${this.kills} / ${this.targetKills}`);

        // Small explosion effect
        const burst = this.add.circle(asteroid.x, asteroid.y, 8, 0xffff00);
        this.tweens.add({
            targets: burst,
            scale: 4,
            alpha: 0,
            duration: 300,
            onComplete: () => burst.destroy()
        });

        if (this.kills >= this.targetKills) {
            this.completeBonus();
        }
    }

    completeBonus() {
        // Stop spawning
        this.time.removeAllEvents();

        // Victory message
        const text = this.add.text(640, 360, "BONUS COMPLETE!\n🌟 Fantastisch! 🌟", {
            fontSize: '48px',
            color: '#00ff88',
            align: 'center'
        }).setOrigin(0.5);

        text.setScale(0);
        this.tweens.add({
            targets: text,
            scale: 1.2,
            ease: 'Back.easeOut',
            duration: 600
        });

        // After 3 sec → continue
        this.time.delayedCall(3000, () => {
            this.scene.start('Start');   // or Level2
        });
    }

    update() {
        this.background.tilePositionX += 2;

        // Ship movement
        if (this.cursors.left.isDown) {
            this.ship.setVelocityX(-300);
        } else if (this.cursors.right.isDown) {
            this.ship.setVelocityX(300);
        } else {
            this.ship.setVelocityX(0);
        }

        // Shoot
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.shootLaser();
        }
    }
}
SaveManager.saveProgress(2);
this.scene.start('Level2');  
