import * as Phaser from 'phaser';
import { SCENE_KEYS, ASSET_KEYS } from '../common';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    console.log('PreloadScene: Loading assets...');
    
    // Create a loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffd700, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      console.log('PreloadScene: Assets loaded successfully');
    });
    
    // Load assets here if you have any
    // Example: this.load.image(ASSET_KEYS.CARDS, 'assets/cards.png');
  }

  create(): void {
    console.log('PreloadScene: Starting menu...');
    this.scene.start(SCENE_KEYS.MENU);
  }
}