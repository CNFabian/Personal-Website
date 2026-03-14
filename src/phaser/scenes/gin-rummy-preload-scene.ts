import * as Phaser from 'phaser';
import { ASSET_KEYS } from '../common';

const GIN_RUMMY_PRELOAD_KEY = 'GinRummyPreloadScene';

export class GinRummyPreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: GIN_RUMMY_PRELOAD_KEY });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading Gin Rummy...', {
      fontSize: '20px',
      color: '#ffd700',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffd700, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load the card spritesheet if it exists
    // The game will work without it using procedural rendering
    try {
      this.load.spritesheet(ASSET_KEYS.CARDS, 'assets/cards.png', {
        frameWidth: 140,
        frameHeight: 190,
      });
    } catch {
      // Cards will render procedurally
    }
  }

  create(): void {
    this.scene.start('GinRummyGameScene');
  }
}

export { GIN_RUMMY_PRELOAD_KEY };
