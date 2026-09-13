/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 */


import { Start } from './scenes/Start.js';
import { HyperJump } from './scenes/HyperJump.js';   
import { Level1 } from './scenes/Level1.js'; 
import { Level2 } from './scenes/Level2.js';
import { Level3 } from './scenes/Level3.js';
import { Level4 } from './scenes/Level4.js';
import { ProfilePicker } from './scenes/ProfilePicker.js';
import { ParentConfig } from './scenes/ParentConfig.js';

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
        HyperJump,  // Lightspeed transition
        Level1,    // The actual game level
        Level2,   // Level2 obv
        Level3,  // Level3 ...ad nauseam
        Level4,  // Level4 ...ad infinitum
        ProfilePicker,  // Wie speelt er? (maaltafels)
        ParentConfig    // Ouderscherm
    ]
};

new Phaser.Game(config);