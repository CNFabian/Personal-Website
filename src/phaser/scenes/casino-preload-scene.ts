import * as Phaser from 'phaser';
import { COLORS } from '../common';

const CASINO_PRELOAD_KEY = 'CasinoPreloadScene';
const CASINO_LOBBY_KEY = 'CasinoLobbyScene';
const CARPET_TEXTURE_KEY = 'casinoCarpet';

export class CasinoPreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: CASINO_PRELOAD_KEY });
  }

  preload(): void {
    console.log('CasinoPreloadScene: Loading assets...');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create a loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Entering Casino...', {
      fontSize: '20px',
      color: '#ffffff',
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
      console.log('CasinoPreloadScene: Assets loaded');
    });
  }

  create(): void {
    console.log('CasinoPreloadScene: Creating...');

    // Generate casino carpet texture at runtime
    this.createCarpetTexture();

    console.log('CasinoPreloadScene: Starting lobby...');
    this.scene.start(CASINO_LOBBY_KEY);
  }

  private createCarpetTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Carpet size: 256x256
    const size = 256;
    const patternSize = 32;

    // Base dark green color
    graphics.fillStyle(0x1a5c2f, 1);
    graphics.fillRect(0, 0, size, size);

    // Diamond pattern overlay
    graphics.fillStyle(0x0f4620, 0.6);
    for (let row = 0; row < size / patternSize; row++) {
      for (let col = 0; col < size / patternSize; col++) {
        const x = col * patternSize + patternSize / 2;
        const y = row * patternSize + patternSize / 2;
        const half = patternSize / 4;

        // Draw diamond
        graphics.beginPath();
        graphics.moveTo(x - half, y);
        graphics.lineTo(x, y - half);
        graphics.lineTo(x + half, y);
        graphics.lineTo(x, y + half);
        graphics.closePath();
        graphics.fillPath();
      }
    }

    // Generate texture and clean up
    graphics.generateTexture(CARPET_TEXTURE_KEY, size, size);
    graphics.destroy();
  }
}

export const CASINO_SCENE_KEYS = {
  PRELOAD: CASINO_PRELOAD_KEY,
  LOBBY: CASINO_LOBBY_KEY,
  CARPET_TEXTURE: CARPET_TEXTURE_KEY,
};
