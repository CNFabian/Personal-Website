import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, GameRules, DEFAULT_RULES, RULE_DESCRIPTIONS, RULE_NAMES } from '../common';

export class RulesScene extends Phaser.Scene {
  private rules: GameRules;
  private toggles: Map<keyof GameRules, Phaser.GameObjects.Container>;
  private rulesContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.RULES });
    this.rules = { ...DEFAULT_RULES };
    this.toggles = new Map();
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createRulesPanel();
    this.createButtons();
    this.setupKeyboard();
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
    graphics.lineStyle(8, 0x8B4513);
    graphics.strokeRoundedRect(
      50, 50,
      this.cameras.main.width - 100,
      this.cameras.main.height - 100,
      20
    );
  }

  private createTitle(): void {
    this.add.text(
      this.cameras.main.centerX,
      80,
      'GAME RULES CONFIGURATION',
      {
        fontSize: '48px',
        color: COLORS.GOLD,
        fontStyle: 'bold',
        stroke: COLORS.BLACK,
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    this.add.text(
      this.cameras.main.centerX,
      130,
      'Toggle which slap rules you want to play with',
      {
        fontSize: '20px',
        color: COLORS.WHITE
      }
    ).setOrigin(0.5);
  }

  private createRulesPanel(): void {
    this.rulesContainer = this.add.container(0, 0);

    const panelWidth = 900;
    const panelHeight = 500;
    const panelX = this.cameras.main.centerX - panelWidth / 2;
    const panelY = 180;

    const panel = this.add.rectangle(
      this.cameras.main.centerX,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.9
    );
    panel.setStrokeStyle(3, 0xffd700);
    this.rulesContainer.add(panel);

    const ruleKeys = Object.keys(this.rules) as Array<keyof GameRules>;
    const itemsPerColumn = 4;
    const columnWidth = panelWidth / 2;
    const startX = panelX + 50;
    const startY = panelY + 40;
    const spacing = 60;

    ruleKeys.forEach((ruleKey, index) => {
      const column = Math.floor(index / itemsPerColumn);
      const row = index % itemsPerColumn;
      
      const x = startX + column * columnWidth;
      const y = startY + row * spacing;

      const toggle = this.createToggle(ruleKey, x, y);
      this.toggles.set(ruleKey, toggle);
      this.rulesContainer.add(toggle);
    });
  }

  private createToggle(
    ruleKey: keyof GameRules,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const boxSize = 30;
    const box = this.add.rectangle(0, 0, boxSize, boxSize, 0x333333);
    box.setStrokeStyle(2, 0xffd700);
    
    const checkmark = this.add.text(0, 0, '✓', {
      fontSize: '24px',
      color: COLORS.GREEN,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    checkmark.setVisible(this.rules[ruleKey]);
    
    const nameText = this.add.text(
      boxSize / 2 + 15,
      0,
      RULE_NAMES[ruleKey],
      {
        fontSize: '20px',
        color: COLORS.WHITE,
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0.5);
    
    const descText = this.add.text(
      boxSize / 2 + 15,
      20,
      RULE_DESCRIPTIONS[ruleKey],
      {
        fontSize: '14px',
        color: COLORS.LIGHT_GRAY
      }
    ).setOrigin(0, 0.5);
    
    container.add([box, checkmark, nameText, descText]);
    container.setSize(400, 50);
    container.setInteractive();
    
    (container as any).box = box;
    (container as any).checkmark = checkmark;
    (container as any).ruleKey = ruleKey;
    
    container.on('pointerover', () => {
      box.setFillStyle(0x444444);
      container.setScale(1.02);
    });
    
    container.on('pointerout', () => {
      box.setFillStyle(0x333333);
      container.setScale(1);
    });
    
    container.on('pointerdown', () => {
      this.toggleRule(ruleKey);
    });
    
    return container;
  }

  private toggleRule(ruleKey: keyof GameRules): void {
    this.rules[ruleKey] = !this.rules[ruleKey];
    
    const toggle = this.toggles.get(ruleKey);
    if (toggle) {
      const checkmark = (toggle as any).checkmark as Phaser.GameObjects.Text;
      checkmark.setVisible(this.rules[ruleKey]);
      
      const box = (toggle as any).box as Phaser.GameObjects.Rectangle;
      box.setFillStyle(this.rules[ruleKey] ? 0x00ff00 : 0x333333);
      this.time.delayedCall(100, () => {
        box.setFillStyle(0x333333);
      });
    }
  }

  private createButtons(): void {
    const buttonY = 700;
    
    this.createButton(
      this.cameras.main.centerX - 160,
      buttonY,
      'START GAME',
      () => this.startGame()
    );
    
    this.createButton(
      this.cameras.main.centerX + 160,
      buttonY,
      'RESET DEFAULT',
      () => this.resetToDefault()
    );
    
    this.createButton(
      this.cameras.main.centerX,
      buttonY + 60,
      'BACK TO MENU',
      () => this.scene.start(SCENE_KEYS.MENU)
    );
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 280, 55, 0x8B4513);
    bg.setStrokeStyle(3, 0xffd700);
    
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    button.add([bg, buttonText]);
    button.setSize(280, 55);
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

  private resetToDefault(): void {
    this.rules = { ...DEFAULT_RULES };
    
    this.toggles.forEach((toggle, ruleKey) => {
      const checkmark = (toggle as any).checkmark as Phaser.GameObjects.Text;
      checkmark.setVisible(this.rules[ruleKey]);
    });
    
    this.cameras.main.flash(200, 255, 255, 255, false);
  }

  private startGame(): void {
    const hasActiveRule = Object.values(this.rules).some(v => v === true);
    
    if (!hasActiveRule) {
      const warning = this.add.text(
        this.cameras.main.centerX,
        650,
        'Please enable at least one rule!',
        {
          fontSize: '24px',
          color: COLORS.RED,
          fontStyle: 'bold',
          stroke: COLORS.BLACK,
          strokeThickness: 3
        }
      ).setOrigin(0.5);
      
      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: warning,
          alpha: 0,
          duration: 500,
          onComplete: () => warning.destroy()
        });
      });
      
      return;
    }
    
    this.scene.start(SCENE_KEYS.GAME, { rules: this.rules });
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
    
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.startGame();
    });
  }
}