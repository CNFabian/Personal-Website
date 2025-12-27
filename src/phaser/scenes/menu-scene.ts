import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEFAULT_RULES } from '../common';

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Container;
  private instructionsVisible = false;
  private instructionsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  public create(): void {
    console.log('MenuScene create method called');
    this.createBackground();
    this.createTitle();
    this.createMainMenu();
    this.createInstructions();
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
    
    const title = this.add.text(centerX, 120, 'EGYPTIAN', {
      fontSize: '64px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    const subtitle = this.add.text(centerX, 190, 'RATSCREW', {
      fontSize: '64px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    title.setShadow(0, 0, COLORS.GOLD, 10, false, true);
    subtitle.setShadow(0, 0, COLORS.GOLD, 10, false, true);

    this.add.text(centerX, 240, 'The Fast-Paced Card Slapping Game', {
      fontSize: '24px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  private createMainMenu(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Quick Start Button (with default rules)
    this.createButton(centerX, centerY + 20, 'QUICK START', () => {
      this.quickStart();
    });

    // Configure Rules Button
    this.createButton(centerX, centerY + 90, 'CONFIGURE RULES', () => {
      this.scene.start(SCENE_KEYS.RULES);
    });

    // Instructions Button
    this.createButton(centerX, centerY + 160, 'HOW TO PLAY', () => {
      this.toggleInstructions();
    });

    // Controls hint
    const controlsHint = this.add.text(centerX, this.cameras.main.height - 50, 
      'Press SPACE for Quick Start | ESC for instructions', {
      fontSize: '18px',
      color: COLORS.WHITE
    }).setOrigin(0.5);
    controlsHint.setAlpha(0.8);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 320, 60, 0x8B4513);
    bg.setStrokeStyle(3, 0xffd700);
    
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(320, 60);
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
    
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );

    const panel = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      700,
      600,
      0x1a1a1a
    );
    panel.setStrokeStyle(3, 0xffd700);

    const title = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 270,
      'HOW TO PLAY EGYPTIAN RATSCREW',
      {
        fontSize: '28px',
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const instructions = [
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

    let yOffset = -240;
    instructions.forEach((line) => {
      const color = line.endsWith(':') ? COLORS.GOLD : COLORS.WHITE;
      const fontSize = line.endsWith(':') ? '20px' : '16px';
      const fontStyle = line.endsWith(':') ? 'bold' : 'normal';

      const instructionText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + yOffset,
        line,
        {
          fontSize,
          color,
          fontStyle
        }
      ).setOrigin(0.5);

      this.instructionsContainer.add(instructionText);
      yOffset += line === '' ? 10 : 24;
    });

    this.instructionsContainer.add([overlay, panel, title]);
    this.instructionsContainer.setVisible(false);
  }

  private setupInput(): void {
    // Space to quick start
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.instructionsVisible) {
        this.quickStart();
      }
    });

    // ESC for instructions
    this.input.keyboard?.on('keydown-ESC', () => {
      this.toggleInstructions();
    });

    // Click outside instructions to close
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.instructionsVisible) {
        const panelBounds = new Phaser.Geom.Rectangle(
          this.cameras.main.centerX - 350,
          this.cameras.main.centerY - 300,
          700,
          600
        );
        if (!Phaser.Geom.Rectangle.Contains(panelBounds, pointer.x, pointer.y)) {
          this.toggleInstructions();
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