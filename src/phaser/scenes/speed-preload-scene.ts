import * as Phaser from 'phaser';
import { ASSET_KEYS, isMobileDevice } from '../common';
import { SPEED_MENU_SCENE_KEY } from './speed-menu-scene';

export const SPEED_PRELOAD_SCENE_KEY = 'SpeedPreloadScene';

export class SpeedPreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SPEED_PRELOAD_SCENE_KEY });
  }

  preload(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;
    const isMobile = isMobileDevice();

    // Loading bar
    const barW = isMobile ? 300 : 400;
    const barH = isMobile ? 20 : 30;
    const barX = w / 2 - barW / 2;
    const barY = h / 2 - barH / 2;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(barX, barY, barW, barH);

    this.add.text(w / 2, barY - 30, 'Loading Speed...', {
      fontSize: isMobile ? '18px' : '24px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xFFD700, 1);
      progressBar.fillRect(barX + 4, barY + 4, (barW - 8) * value, barH - 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Load card sprite sheet (same asset as other games)
    if (!this.textures.exists(ASSET_KEYS.CARDS)) {
      this.load.spritesheet(ASSET_KEYS.CARDS, '/assets/cards/cards.png', {
        frameWidth: 314,
        frameHeight: 440,
      });
    }
  }

  create(): void {
    this.scene.start(SPEED_MENU_SCENE_KEY);
  }
}
