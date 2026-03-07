import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEFAULT_RULES, GameRules, RULE_NAMES, RULE_DESCRIPTIONS } from '../common';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const RULES_STORAGE_KEY = 'ratscrew_rules';

/** Load saved rules from localStorage, falling back to defaults */
function loadSavedRules(): GameRules {
  try {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle any newly-added rule keys
      return { ...DEFAULT_RULES, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_RULES };
}

/** Persist rules to localStorage */
function saveRules(rules: GameRules): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Ignore storage errors
  }
}

export class LobbyScene extends Phaser.Scene {
  private socket!: Socket;
  private statusText!: Phaser.GameObjects.Text;
  private roomCodeDisplay!: Phaser.GameObjects.Text;
  private joinInput: string = '';
  private joinInputText!: Phaser.GameObjects.Text;
  private inputCursor!: Phaser.GameObjects.Text;
  private cursorTimer!: Phaser.Time.TimerEvent;
  private isJoining: boolean = false;
  private isWaiting: boolean = false;
  private myRoomCode: string = '';
  private myPlayerNumber: 1 | 2 = 1;
  private rules: GameRules = { ...DEFAULT_RULES };

  // Rule toggle tracking
  private ruleToggles: Map<keyof GameRules, { box: Phaser.GameObjects.Rectangle; checkmark: Phaser.GameObjects.Text }> = new Map();

  // UI containers for show/hide
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private joinContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.LOBBY });
  }

  init(data: { rules?: GameRules }): void {
    // Load from localStorage first, then override with passed-in rules if any
    this.rules = loadSavedRules();
    if (data?.rules) {
      this.rules = { ...data.rules };
    }
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createMainMenu();
    this.createWaitingUI();
    this.createJoinUI();
    this.createStatusBar();
    this.setupKeyboard();
    this.connectSocket();

    // Start with main menu visible
    this.showMainMenu();
  }

  // ---- Background & Title ----

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
    const centerX = this.cameras.main.centerX;

    this.add.text(centerX, 100, 'ONLINE MULTIPLAYER', {
      fontSize: '48px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(centerX, 155, 'Play against a friend over the internet', {
      fontSize: '20px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  // ---- Main menu (Rules panel + Create / Join buttons) ----

  private createMainMenu(): void {
    const centerX = this.cameras.main.centerX;
    this.mainMenuContainer = this.add.container(0, 0);

    // Rules panel
    this.createRulesPanel();

    // Buttons below the rules panel
    const buttonsStartY = 590;

    const createBtn = this.createButton(centerX, buttonsStartY, 'CREATE ROOM', () => {
      // Validate at least one rule
      const hasActiveRule = Object.values(this.rules).some(v => v === true);
      if (!hasActiveRule) {
        this.statusText.setText('Please enable at least one rule!');
        this.time.delayedCall(2000, () => {
          if (this.statusText) this.statusText.setText('');
        });
        return;
      }
      saveRules(this.rules);
      this.socket.emit('createRoom', { rules: this.rules });
    });

    const joinBtn = this.createButton(centerX, buttonsStartY + 70, 'JOIN ROOM', () => {
      this.showJoinUI();
    });

    const backBtn = this.createButton(centerX, buttonsStartY + 140, 'BACK TO MENU', () => {
      this.cleanupAndReturn();
    });

    this.mainMenuContainer.add([createBtn, joinBtn, backBtn]);
  }

  private createRulesPanel(): void {
    const centerX = this.cameras.main.centerX;
    const panelWidth = 820;
    const panelHeight = 370;
    const panelY = 190;

    // Panel background
    const panelBg = this.add.rectangle(
      centerX,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.85
    );
    panelBg.setStrokeStyle(2, 0xffd700);

    // Panel title
    const panelTitle = this.add.text(centerX, panelY + 20, 'GAME RULES', {
      fontSize: '22px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.mainMenuContainer.add([panelBg, panelTitle]);

    // Create rule toggles in a 2-column grid
    const ruleKeys = Object.keys(this.rules) as Array<keyof GameRules>;
    const itemsPerColumn = 4;
    const columnWidth = panelWidth / 2;
    const startX = centerX - panelWidth / 2 + 50;
    const startY = panelY + 55;
    const spacing = 42;

    ruleKeys.forEach((ruleKey, index) => {
      const column = Math.floor(index / itemsPerColumn);
      const row = index % itemsPerColumn;
      const x = startX + column * columnWidth;
      const y = startY + row * spacing;

      this.createRuleToggle(ruleKey, x, y);
    });

    // Reset defaults button (small, bottom-right of panel)
    const resetBtn = this.add.container(centerX + panelWidth / 2 - 90, panelY + panelHeight - 25);
    const resetBg = this.add.rectangle(0, 0, 140, 30, 0x333333);
    resetBg.setStrokeStyle(1, 0x666666);
    const resetText = this.add.text(0, 0, 'RESET DEFAULTS', {
      fontSize: '12px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    resetBtn.add([resetBg, resetText]);
    resetBtn.setSize(140, 30);
    resetBtn.setInteractive();

    resetBtn.on('pointerover', () => {
      resetBg.setFillStyle(0x444444);
    });
    resetBtn.on('pointerout', () => {
      resetBg.setFillStyle(0x333333);
    });
    resetBtn.on('pointerup', () => {
      this.rules = { ...DEFAULT_RULES };
      saveRules(this.rules);
      this.ruleToggles.forEach((toggle, key) => {
        toggle.checkmark.setVisible(this.rules[key]);
        toggle.box.setFillStyle(this.rules[key] ? 0x2a5a2a : 0x333333);
      });
    });

    this.mainMenuContainer.add(resetBtn);
  }

  private createRuleToggle(ruleKey: keyof GameRules, x: number, y: number): void {
    const container = this.add.container(x, y);

    // Checkbox
    const boxSize = 24;
    const box = this.add.rectangle(0, 0, boxSize, boxSize, this.rules[ruleKey] ? 0x2a5a2a : 0x333333);
    box.setStrokeStyle(2, 0xffd700);

    const checkmark = this.add.text(0, 0, '✓', {
      fontSize: '18px',
      color: COLORS.GREEN,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    checkmark.setVisible(this.rules[ruleKey]);

    // Rule name
    const nameText = this.add.text(boxSize / 2 + 12, -6, RULE_NAMES[ruleKey], {
      fontSize: '16px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Description
    const descText = this.add.text(boxSize / 2 + 12, 10, RULE_DESCRIPTIONS[ruleKey], {
      fontSize: '11px',
      color: COLORS.LIGHT_GRAY
    }).setOrigin(0, 0.5);

    container.add([box, checkmark, nameText, descText]);
    container.setSize(380, 36);
    container.setInteractive();

    container.on('pointerover', () => {
      box.setFillStyle(0x444444);
    });

    container.on('pointerout', () => {
      box.setFillStyle(this.rules[ruleKey] ? 0x2a5a2a : 0x333333);
    });

    container.on('pointerdown', () => {
      this.rules[ruleKey] = !this.rules[ruleKey];
      checkmark.setVisible(this.rules[ruleKey]);
      box.setFillStyle(this.rules[ruleKey] ? 0x2a5a2a : 0x333333);
      saveRules(this.rules);
    });

    this.ruleToggles.set(ruleKey, { box, checkmark });
    this.mainMenuContainer.add(container);
  }

  // ---- Waiting UI (after creating a room) ----

  private createWaitingUI(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.waitingContainer = this.add.container(0, 0);

    // Room code label
    const codeLabel = this.add.text(centerX, centerY - 80, 'ROOM CODE:', {
      fontSize: '24px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Room code display (large)
    this.roomCodeDisplay = this.add.text(centerX, centerY - 30, '----', {
      fontSize: '64px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 4
    }).setOrigin(0.5);

    // Instruction
    const shareText = this.add.text(centerX, centerY + 30, 'Share this code with your friend!', {
      fontSize: '20px',
      color: COLORS.WHITE
    }).setOrigin(0.5);

    // Waiting indicator
    const waitingText = this.add.text(centerX, centerY + 80, 'Waiting for opponent...', {
      fontSize: '22px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Pulsing animation on waiting text
    this.tweens.add({
      targets: waitingText,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const cancelBtn = this.createButton(centerX, centerY + 160, 'CANCEL', () => {
      this.socket.disconnect();
      this.connectSocket();
      this.showMainMenu();
    });

    this.waitingContainer.add([codeLabel, this.roomCodeDisplay, shareText, waitingText, cancelBtn]);
    this.waitingContainer.setVisible(false);
  }

  // ---- Join UI (text input for room code) ----

  private createJoinUI(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.joinContainer = this.add.container(0, 0);

    const label = this.add.text(centerX, centerY - 80, 'ENTER ROOM CODE:', {
      fontSize: '24px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Input background
    const inputBg = this.add.rectangle(centerX, centerY - 20, 280, 60, 0x1a1a1a);
    inputBg.setStrokeStyle(3, 0xffd700);

    // Input text
    this.joinInputText = this.add.text(centerX, centerY - 20, '', {
      fontSize: '42px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      letterSpacing: 8
    }).setOrigin(0.5);

    // Blinking cursor
    this.inputCursor = this.add.text(centerX + 5, centerY - 20, '|', {
      fontSize: '42px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.cursorTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.inputCursor.setVisible(!this.inputCursor.visible);
      },
      loop: true
    });

    const joinBtn = this.createButton(centerX, centerY + 50, 'JOIN', () => {
      if (this.joinInput.length === 4) {
        this.socket.emit('joinRoom', { roomCode: this.joinInput });
      }
    });

    const backBtn = this.createButton(centerX, centerY + 120, 'BACK', () => {
      this.joinInput = '';
      this.isJoining = false;
      this.showMainMenu();
    });

    this.joinContainer.add([label, inputBg, this.joinInputText, this.inputCursor, joinBtn, backBtn]);
    this.joinContainer.setVisible(false);
  }

  // ---- Status bar ----

  private createStatusBar(): void {
    this.statusText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 80,
      '',
      {
        fontSize: '18px',
        color: COLORS.RED,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
  }

  // ---- Keyboard ----

  private setupKeyboard(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.isJoining) {
        this.joinInput = '';
        this.isJoining = false;
        this.showMainMenu();
      } else if (this.isWaiting) {
        this.socket.disconnect();
        this.connectSocket();
        this.showMainMenu();
      } else {
        this.cleanupAndReturn();
      }
    });

    // Text input for join code
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (!this.isJoining) return;

      if (event.key === 'Backspace') {
        this.joinInput = this.joinInput.slice(0, -1);
        this.updateJoinInputDisplay();
        return;
      }

      if (event.key === 'Enter' && this.joinInput.length === 4) {
        this.socket.emit('joinRoom', { roomCode: this.joinInput });
        return;
      }

      // Only allow alphanumeric, max 4 chars
      if (/^[a-zA-Z0-9]$/.test(event.key) && this.joinInput.length < 4) {
        this.joinInput += event.key.toUpperCase();
        this.updateJoinInputDisplay();
      }
    });
  }

  private updateJoinInputDisplay(): void {
    this.joinInputText.setText(this.joinInput);

    // Position cursor after text
    const textWidth = this.joinInputText.width;
    this.inputCursor.setX(this.cameras.main.centerX + textWidth / 2 + 5);
  }

  // ---- Socket.io ----

  private connectSocket(): void {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Lobby] Connected to server');
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('[Lobby] Connection error:', err.message);
      this.statusText.setText('Cannot connect to server. Is it running?');
    });

    this.socket.on('roomCreated', (data: { roomCode: string; playerNumber: number }) => {
      console.log('[Lobby] Room created:', data.roomCode);
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = 1;
      this.roomCodeDisplay.setText(data.roomCode);
      this.showWaitingUI();
    });

    this.socket.on('roomJoined', (data: { roomCode: string; playerNumber: number }) => {
      console.log('[Lobby] Joined room:', data.roomCode, 'as player', data.playerNumber);
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = data.playerNumber as 1 | 2;
      this.statusText.setText('Joined! Starting game...');
    });

    this.socket.on('roomError', (data: { message: string }) => {
      this.statusText.setText(data.message);
      // Clear error after 3 seconds
      this.time.delayedCall(3000, () => {
        if (this.statusText) this.statusText.setText('');
      });
    });

    this.socket.on('waitingForOpponent', (data: { message: string }) => {
      console.log('[Lobby]', data.message);
    });

    this.socket.on('gameStart', (data: { gameState: any; rules: any }) => {
      console.log('[Lobby] Game starting! Room:', this.myRoomCode, 'Player:', this.myPlayerNumber);

      // Transition to game scene with multiplayer config
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.GAME, {
          rules: data.rules,
          multiplayer: true,
          playerNumber: this.myPlayerNumber,
          roomCode: this.myRoomCode,
          socket: this.socket, // Pass the socket directly
        });
      });
    });
  }

  // ---- UI visibility helpers ----

  private showMainMenu(): void {
    this.isJoining = false;
    this.isWaiting = false;
    this.mainMenuContainer.setVisible(true);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(false);
    this.statusText.setText('');
  }

  private showWaitingUI(): void {
    this.isWaiting = true;
    this.isJoining = false;
    this.mainMenuContainer.setVisible(false);
    this.waitingContainer.setVisible(true);
    this.joinContainer.setVisible(false);
  }

  private showJoinUI(): void {
    this.isJoining = true;
    this.isWaiting = false;
    this.joinInput = '';
    this.updateJoinInputDisplay();
    this.mainMenuContainer.setVisible(false);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(true);
  }

  // ---- Cleanup ----

  private cleanupAndReturn(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  shutdown(): void {
    // Don't disconnect here — the socket is handed off to GameScene
    if (this.cursorTimer) {
      this.cursorTimer.destroy();
    }
  }

  // ---- Button helper (matches menu-scene style) ----

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
}
