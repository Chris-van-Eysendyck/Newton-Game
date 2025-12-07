/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */

export class HyperJump extends Phaser.Scene {

    constructor() {
        super('HyperJump');
    }

    preload() {
        this.load.image('star', 'assets/star.png'); // a tiny white dot (2×2 or 4×4)
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.stars = [];

        // Create many stars that will stretch forward
        for (let i = 0; i < 300; i++) {

            let star = this.add.sprite(width / 2, height / 2, 'star');
            star.speed = Phaser.Math.FloatBetween(2, 8);
            star.angle = Phaser.Math.Between(0, 360);  // movement direction
            star.scaleBase = Phaser.Math.FloatBetween(0.05, 0.15);
            star.setScale(star.scaleBase);

            this.stars.push(star);
        }

        // After the jump effect, fade to PlayScene
        this.time.delayedCall(2200, () => {
            this.cameras.main.fadeOut(500);
        });

        this.cameras.main.on('camerafadeoutcomplete', () => {
            this.scene.start('Level1');
        });
    }

    update() {

        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        this.stars.forEach(star => {
            
            // Star flies outward
            const rad = Phaser.Math.DegToRad(star.angle);
            star.x += Math.cos(rad) * star.speed;
            star.y += Math.sin(rad) * star.speed;

            // Stars stretch (grow) to show speed streaks
            star.setScale(star.scaleBase * 8);

            // If star leaves screen, reset it in the center
            if (star.x < -50 || star.x > width + 50 || star.y < -50 || star.y > height + 50) {
                star.x = width / 2;
                star.y = height / 2;
                star.angle = Phaser.Math.Between(0, 360);
            }
        });
    }
}
