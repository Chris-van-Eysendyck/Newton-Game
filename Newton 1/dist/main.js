/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */


import { Start } from './scenes/Start.js';
import { Game } from './scenes/GameScene1.js';
import { HyperJump } from './scenes/HyperJump.js';   
import { Level1 } from './scenes/Level1.js'; 

const config = {
    type: Phaser.AUTO,
    title: 'NEWTON',
    parent: 'game-container',

    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: false,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    physics: {
        default: 'arcade'
    },

    // Scenes in correct order
    scene: [
        Start,       // Main menu
        Game,        // Intro text scene
        HyperJump,   // Lightspeed transition
        Level1       // The actual game level
    ]
};

new Phaser.Game(config);