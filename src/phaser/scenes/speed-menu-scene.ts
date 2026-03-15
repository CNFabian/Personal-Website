import * as Phaser from 'phaser';
import { COLORS, SCENE_KEYS, isMobileDevice, isPortrait, AUTH_STORAGE_KEYS, AuthUser } from '../common';
import { SPEED_LOBBY_SCENE_KEY } from './speed-lobby-scene';

export const SPEED_MENU_SCENE_KEY = 'SpeedMenuScene';

export class SpeedMenuScene extends Phaser.Scene {
  private isMobile = false;

  constructor() {
    super({ key: SPEED_MENU_SCENE_KEY });
  }

  create(): void {
    this.isMobile = isMobileDevice();
    const w = +this.game.config.width;
    const h = +this.game.config.height;
    const portrait = isPortrait();

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a5f38, 1);
    bg.fillRect(0, 0, w, h);
    bg.lineStyle(portrait ? 4 : 8, 0x8B4513);
    bg.strokeRoundedRect(
      portrait ? 25 : 50, portrait ? 25 : 50,
      w - (portrait ? 50 : 100), h - (portrait ? 50 : 100), 20
    );

    // Title
    this.add.text(w / 2, portrait ? 100 : 120, 'SPEED', {
      fontSize: portrait ? '48px' : '72px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
      stroke: COLORS.BLACK,
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(w / 2, portrait ? 155 : 190, 'The classic real-time card game', {
      fontSize: portrait ? '14px' : '18px',
      color: COLORS.WHITE,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Buttons
    const startY = portrait ? 240 : 300;
    const gap = portrait ? 65 : 80;

    this.createButton(w / 2, startY, 'PLAY ONLINE', 0x27AE60, () => this.goToLobby());
    this.createButton(w / 2, startY + gap, 'HOW TO PLAY', 0x8E44AD, () => this.showRules());
    this.createButton(w / 2, startY + gap * 2, '← BACK TO CASINO', 0x7F8C8D, () => {
      window.location.href = '/casino';
    });

    // Rules text (hidden by default, toggled)
    this.createRulesOverlay();
  }

  private goToLobby(): void {
    // Check auth first
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
    const username = localStorage.getItem(AUTH_STORAGE_KEYS.USERNAME);

    if (!token || !username) {
      // Go to auth scene
      this.scene.start(SCENE_KEYS.AUTH, {
        returnScene: SPEED_LOBBY_SCENE_KEY,
        gameTitle: 'Speed',
      });
      return;
    }

    const authUser: AuthUser = {
      token,
      username,
      userId: parseInt(localStorage.getItem('ratscrew_user_id') || '0'),
      wins: 0,
    };

    this.scene.start(SPEED_LOBBY_SCENE_KEY, { authUser });
  }

  private rulesContainer: Phaser.GameObjects.Container | null = null;

  private showRules(): void {
    if (this.rulesContainer) {
      this.rulesContainer.setVisible(!this.rulesContainer.visible);
      return;
    }

    const w = +this.game.config.width;
    const h = +this.game.config.height;
    const portrait = isPortrait();

    this.rulesContainer = this.add.container(0, 0).setDepth(100);

    // Dim background
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    dim.setInteractive();
    this.rulesContainer.add(dim);

    // Rules panel
    const pw = portrait ? w - 60 : 500;
    const ph = portrait ? h - 120 : 400;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a3a2a, 1);
    panel.fillRoundedRect(w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, 12);
    panel.lineStyle(2, 0xFFD700, 0.5);
    panel.strokeRoundedRect(w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, 12);
    this.rulesContainer.add(panel);

    const fs = portrait ? '12px' : '14px';
    const rulesText = [
      'HOW TO PLAY SPEED',
      '',
      '• Each player gets 5 cards in hand + 15 in a draw pile',
      '• Two center piles start with 1 card each',
      '• Both players play simultaneously — no turns!',
      '• Play a card if it\'s ±1 rank from a center pile top',
      '  (e.g. 5 can go on 4 or 6, Ace wraps with King)',
      '• Tap a card to auto-play, or drag it to a pile',
      '• Your hand refills from your draw pile',
      '• First to empty hand + draw pile wins!',
      '',
      '• When neither player can play, new cards flip onto',
      '  the center piles automatically',
    ].join('\n');

    this.add.text(w / 2, h / 2 - ph / 2 + 20, rulesText, {
      fontSize: fs,
      color: COLORS.WHITE,
      lineSpacing: portrait ? 4 : 6,
      wordWrap: { width: pw - 40 },
    }).setOrigin(0.5, 0).setDepth(101);

    // Close button
    const closeBtn = this.add.text(w / 2, h / 2 + ph / 2 - 30, '[ CLOSE ]', {
      fontSize: portrait ? '14px' : '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(101);
    closeBtn.on('pointerdown', () => {
      this.rulesContainer?.setVisible(false);
    });
    this.rulesContainer.add(closeBtn);
  }

  private createRulesOverlay(): void {
    // Created lazily in showRules
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const portrait = isPortrait();
    const container = this.add.container(x, y).setDepth(30);
    const bw = portrait ? 220 : 280;
    const bh = portrait ? 48 : 58;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
    bg.lineStyle(2, 0xFFFFFF, 0.3);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);

    const text = this.add.text(0, 0, label, {
      fontSize: portrait ? '16px' : '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => container.setScale(1.05));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => container.setScale(0.95));
    container.on('pointerup', () => {
      container.setScale(1);
      callback();
    });

    return container;
  }
}
