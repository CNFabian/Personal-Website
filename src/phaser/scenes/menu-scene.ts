import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEFAULT_RULES, LeaderboardEntry, AUTH_STORAGE_KEYS, isMobileDevice, isPortrait } from '../common';

const API_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Container;
  private instructionsVisible = false;
  private leaderboardVisible = false;
  private instructionsContainer!: Phaser.GameObjects.Container;
  private leaderboardContainer!: Phaser.GameObjects.Container;
  private userInfoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  public create(): void {
    console.log('MenuScene create method called');
    this.createBackground();
    this.createTitle();
    this.createMainMenu();
    this.createInstructions();
    this.createLeaderboard();
    this.createUserInfo();
    this.setupInput();
  }

  private createBackground(): void {
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x0a5f38
    );

    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1a8e5a, 0.3);
    
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.cameras.main.width;
      const y = Math.random() * this.cameras.main.height;
      graphics.strokeCircle(x, y, Math.random() * 50 + 10);
    }
  }

  private createTitle(): void {
    const centerX = this.cameras.main.centerX;
    const portrait = isPortrait();
    const titleSize = portrait ? '48px' : '64px';
    const titleY1 = portrait ? 90 : 120;
    const titleY2 = portrait ? 145 : 190;
    const subY = portrait ? 190 : 240;

    const title = this.add.text(centerX, titleY1, 'EGYPTIAN', {
      fontSize: titleSize,
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    const subtitle = this.add.text(centerX, titleY2, 'RATSCREW', {
      fontSize: titleSize,
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    title.setShadow(0, 0, COLORS.GOLD, 10, false, true);
    subtitle.setShadow(0, 0, COLORS.GOLD, 10, false, true);

    this.add.text(centerX, subY, 'The Fast-Paced Card Slapping Game', {
      fontSize: portrait ? '18px' : '24px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  private createMainMenu(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const mobile = isMobileDevice();

    if (mobile) {
      // Mobile: only online play, leaderboard, how to play
      this.createButton(centerX, centerY - 15, 'PLAY ONLINE', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENE_KEYS.AUTH);
        });
      });

      this.createButton(centerX, centerY + 55, 'LEADERBOARD', () => {
        this.toggleLeaderboard();
      });

      this.createButton(centerX, centerY + 125, 'HOW TO PLAY', () => {
        this.toggleInstructions();
      });
    } else {
      // Desktop: full menu
      // Quick Start Button (with default rules)
      this.createButton(centerX, centerY - 15, 'QUICK START', () => {
        this.quickStart();
      });

      // Configure Rules Button
      this.createButton(centerX, centerY + 55, 'CONFIGURE RULES', () => {
        this.scene.start(SCENE_KEYS.RULES);
      });

      // Play Online Button (now routes through auth)
      this.createButton(centerX, centerY + 125, 'PLAY ONLINE', () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENE_KEYS.AUTH);
        });
      });

      // Leaderboard Button
      this.createButton(centerX, centerY + 195, 'LEADERBOARD', () => {
        this.toggleLeaderboard();
      });

      // Instructions Button
      this.createButton(centerX, centerY + 265, 'HOW TO PLAY', () => {
        this.toggleInstructions();
      });

      // Controls hint
      const controlsHint = this.add.text(centerX, this.cameras.main.height - 50,
        'Press SPACE for Quick Start | ESC for instructions', {
        fontSize: '16px',
        color: COLORS.WHITE
      }).setOrigin(0.5);
      controlsHint.setAlpha(0.7);
    }
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const portrait = isPortrait();
    const btnW = portrait ? 260 : 320;
    const btnH = portrait ? 55 : 60;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x8B4513);
    bg.setStrokeStyle(3, 0xffd700);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: portrait ? '20px' : '24px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(btnW, btnH);
    button.setInteractive();

    button.on('pointerover', () => {
      bg.setFillStyle(0xa0522d);
      button.setScale(1.05);
    });

    button.on('pointerout', () => {
      bg.setFillStyle(0x8B4513);
      button.setScale(1);
    });

    button.on('pointerdown', () => {
      button.setScale(0.95);
    });

    button.on('pointerup', () => {
      button.setScale(1.05);
      callback();
    });

    return button;
  }

  private createInstructions(): void {
    this.instructionsContainer = this.add.container(0, 0);
    const portrait = isPortrait();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = portrait ? 480 : 700;
    const panelH = portrait ? 700 : 600;

    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a1a);
    panel.setStrokeStyle(3, 0xffd700);

    const title = this.add.text(cx, cy - panelH / 2 + 30, 'HOW TO PLAY', {
      fontSize: portrait ? '22px' : '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const instructions = portrait ? [
      'OBJECTIVE:',
      'Collect all 52 cards!',
      '',
      'GAMEPLAY:',
      'Take turns playing cards.',
      'Watch for slap patterns.',
      'First to slap wins the pile!',
      '',
      'FACE CARDS:',
      'Ace = 4, King = 3,',
      'Queen = 2, Jack = 1 chance',
      '',
      'CONTROLS:',
      'Tap PLAY CARD / SLAP buttons',
      '',
      'Tap outside to close'
    ] : [
      'OBJECTIVE:',
      'Be the first player to collect all 52 cards!',
      '',
      'GAMEPLAY:',
      'Players take turns playing cards from their deck.',
      'Watch for slappable conditions (shown in top-left).',
      'First to slap correctly wins the pile!',
      '',
      'FACE CARDS:',
      'When a face card is played, the other player must',
      'respond with face cards or lose the pile:',
      '• Ace = 4 chances',
      '• King = 3 chances',
      '• Queen = 2 chances',
      '• Jack = 1 chance',
      '',
      'CONTROLS:',
      'Player 1: Q = Play Card, A = Slap',
      'Player 2: P = Play Card, L = Slap',
      '',
      'NEW: Configure which slap rules are active!',
      'Active rules display in top-left during game.',
      '',
      'Click outside this panel or press ESC to close'
    ];

    const baseFontSize = portrait ? 14 : 16;
    const headerFontSize = portrait ? 17 : 20;
    const lineSpacing = portrait ? 20 : 24;

    let yOffset = -panelH / 2 + 65;
    instructions.forEach((line) => {
      const color = line.endsWith(':') ? COLORS.GOLD : COLORS.WHITE;
      const fontSize = line.endsWith(':') ? `${headerFontSize}px` : `${baseFontSize}px`;
      const fontStyle = line.endsWith(':') ? 'bold' : 'normal';

      const instructionText = this.add.text(cx, cy + yOffset, line, {
        fontSize, color, fontStyle,
        wordWrap: { width: panelW - 60 }
      }).setOrigin(0.5);

      this.instructionsContainer.add(instructionText);
      yOffset += line === '' ? 8 : lineSpacing;
    });

    this.instructionsContainer.add([overlay, panel, title]);
    this.instructionsContainer.setVisible(false);
  }

  private createLeaderboard(): void {
    this.leaderboardContainer = this.add.container(0, 0);
    const portrait = isPortrait();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);

    const panelWidth = portrait ? 420 : 500;
    const panelHeight = portrait ? 400 : 450;
    const panel = this.add.rectangle(cx, cy, panelWidth, panelHeight, 0x1a1a1a);
    panel.setStrokeStyle(3, 0xffd700);

    const title = this.add.text(cx, cy - panelHeight / 2 + 35, 'LEADERBOARD - TOP 5', {
      fontSize: portrait ? '22px' : '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const loadingText = this.add.text(cx, cy, 'Loading...', {
      fontSize: portrait ? '17px' : '20px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const closeHint = this.add.text(cx, cy + panelHeight / 2 - 30,
      portrait ? 'Tap outside to close' : 'Click outside or press ESC to close', {
      fontSize: portrait ? '12px' : '14px',
      color: COLORS.LIGHT_GRAY
    }).setOrigin(0.5);

    this.leaderboardContainer.add([overlay, panel, title, loadingText, closeHint]);
    this.leaderboardContainer.setVisible(false);
    this.leaderboardContainer.setDepth(500);
  }

  private async fetchAndDisplayLeaderboard(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard`);
      const data = await response.json();
      const entries: LeaderboardEntry[] = data.leaderboard || [];

      // Remove old entries (everything after overlay, panel, title, loading, closeHint = index 5+)
      while (this.leaderboardContainer.length > 5) {
        const child = this.leaderboardContainer.getAt(5) as Phaser.GameObjects.GameObject;
        child.destroy();
        this.leaderboardContainer.removeAt(5);
      }

      // Hide loading text
      const loadingText = this.leaderboardContainer.getAt(3) as Phaser.GameObjects.Text;
      loadingText.setVisible(false);

      const startY = this.cameras.main.centerY - 100;

      if (entries.length === 0) {
        const noData = this.add.text(
          this.cameras.main.centerX,
          this.cameras.main.centerY,
          'No wins recorded yet.\nBe the first!',
          {
            fontSize: '20px',
            color: COLORS.WHITE,
            align: 'center'
          }
        ).setOrigin(0.5);
        this.leaderboardContainer.add(noData);
        return;
      }

      const portrait = isPortrait();
      const cx = this.cameras.main.centerX;
      const colOffset = portrait ? 140 : 180;
      const nameOffset = portrait ? 70 : 100;
      const entryFontSize = portrait ? '18px' : '22px';
      const winsFontSize = portrait ? '16px' : '20px';
      const rowSpacing = portrait ? 48 : 55;

      entries.forEach((entry, i) => {
        const y = startY + i * rowSpacing;
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FFFFFF', '#FFFFFF'];
        const rankEmojis = ['1st', '2nd', '3rd', '4th', '5th'];

        const rankText = this.add.text(cx - colOffset, y, rankEmojis[i], {
          fontSize: entryFontSize, color: rankColors[i], fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const nameText = this.add.text(cx - nameOffset, y, entry.username, {
          fontSize: entryFontSize, color: COLORS.WHITE, fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const winsText = this.add.text(cx + colOffset, y, `${entry.wins} wins`, {
          fontSize: winsFontSize, color: COLORS.GOLD, fontStyle: 'bold'
        }).setOrigin(1, 0.5);

        this.leaderboardContainer.add([rankText, nameText, winsText]);
      });
    } catch {
      const loadingText = this.leaderboardContainer.getAt(3) as Phaser.GameObjects.Text;
      loadingText.setText('Could not load leaderboard.\nIs the server running?');
      loadingText.setColor(COLORS.RED);
    }
  }

  private createUserInfo(): void {
    const username = localStorage.getItem(AUTH_STORAGE_KEYS.USERNAME);
    if (username) {
      this.userInfoText = this.add.text(
        this.cameras.main.width - 20,
        20,
        `Signed in as: ${username}`,
        {
          fontSize: '14px',
          color: COLORS.LIGHT_GRAY,
          fontStyle: 'italic'
        }
      ).setOrigin(1, 0);
    }
  }

  private toggleLeaderboard(): void {
    this.leaderboardVisible = !this.leaderboardVisible;
    this.leaderboardContainer.setVisible(this.leaderboardVisible);
    if (this.leaderboardVisible) {
      this.fetchAndDisplayLeaderboard();
    }
  }

  private setupInput(): void {
    // Space to quick start
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.instructionsVisible) {
        this.quickStart();
      }
    });

    // ESC to close overlays
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.leaderboardVisible) {
        this.toggleLeaderboard();
      } else {
        this.toggleInstructions();
      }
    });

    // Click outside overlays to close
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const portrait = isPortrait();
      if (this.instructionsVisible) {
        const pw = portrait ? 480 : 700;
        const ph = portrait ? 700 : 600;
        const panelBounds = new Phaser.Geom.Rectangle(
          this.cameras.main.centerX - pw / 2,
          this.cameras.main.centerY - ph / 2,
          pw, ph
        );
        if (!Phaser.Geom.Rectangle.Contains(panelBounds, pointer.x, pointer.y)) {
          this.toggleInstructions();
        }
      }
      if (this.leaderboardVisible) {
        const pw = portrait ? 420 : 500;
        const ph = portrait ? 400 : 450;
        const panelBounds = new Phaser.Geom.Rectangle(
          this.cameras.main.centerX - pw / 2,
          this.cameras.main.centerY - ph / 2,
          pw, ph
        );
        if (!Phaser.Geom.Rectangle.Contains(panelBounds, pointer.x, pointer.y)) {
          this.toggleLeaderboard();
        }
      }
    });
  }

  private toggleInstructions(): void {
    this.instructionsVisible = !this.instructionsVisible;
    this.instructionsContainer.setVisible(this.instructionsVisible);
  }

  private quickStart(): void {
    console.log('Quick starting with default rules...');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.GAME, { rules: DEFAULT_RULES });
    });
  }
}