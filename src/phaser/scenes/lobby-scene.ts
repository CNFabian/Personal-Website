import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEFAULT_RULES, GameRules, RULE_NAMES, RULE_DESCRIPTIONS, AuthUser, isMobileDevice } from '../common';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const RULES_STORAGE_KEY = 'ratscrew_rules';

/** Load saved rules from localStorage, falling back to defaults */
function loadSavedRules(): GameRules {
  try {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
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
  private isHosting: boolean = false;
  private myRoomCode: string = '';
  private myPlayerNumber: 1 | 2 = 1;
  private rules: GameRules = { ...DEFAULT_RULES };
  private authUser: AuthUser | null = null;
  private opponentJoined: boolean = false;

  // Mobile
  private isMobile: boolean = false;
  private joinDomElement: Phaser.GameObjects.DOMElement | null = null;

  // Rule toggle tracking
  private ruleToggles: Map<keyof GameRules, { box: Phaser.GameObjects.Rectangle; checkmark: Phaser.GameObjects.Text }> = new Map();

  // UI containers for show/hide
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private hostContainer!: Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private joinContainer!: Phaser.GameObjects.Container;

  // Start Game button (host screen)
  private startGameBtn!: Phaser.GameObjects.Container;
  private startGameBg!: Phaser.GameObjects.Rectangle;
  private startGameText!: Phaser.GameObjects.Text;
  private opponentStatusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.LOBBY });
  }

  init(data: { rules?: GameRules; authUser?: AuthUser | null }): void {
    this.rules = loadSavedRules();
    if (data?.rules) {
      this.rules = { ...data.rules };
    }
    this.authUser = data?.authUser || null;
    this.opponentJoined = false;
    this.isHosting = false;
    this.isMobile = isMobileDevice();
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createMainMenu();
    this.createHostUI();
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

    // Show logged-in username
    if (this.authUser) {
      this.add.text(this.cameras.main.width - 80, 75, `${this.authUser.username}`, {
        fontSize: '16px',
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(this.cameras.main.width - 80, 95, `${this.authUser.wins} wins`, {
        fontSize: '13px',
        color: COLORS.LIGHT_GRAY
      }).setOrigin(0.5);
    } else {
      this.add.text(this.cameras.main.width - 80, 80, 'Guest', {
        fontSize: '16px',
        color: COLORS.LIGHT_GRAY,
        fontStyle: 'italic'
      }).setOrigin(0.5);
    }
  }

  // ---- Main menu (just 3 buttons, no rules panel) ----

  private createMainMenu(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.mainMenuContainer = this.add.container(0, 0);

    const createBtn = this.createButton(centerX, centerY - 70, 'CREATE ROOM', () => {
      // Create the room on server first, then show host UI with rules
      this.socket.emit('createRoom', {
        userId: this.authUser?.userId,
        username: this.authUser?.username,
        token: this.authUser?.token,
      });
    });

    const joinBtn = this.createButton(centerX, centerY, 'JOIN ROOM', () => {
      this.showJoinUI();
    });

    const backBtn = this.createButton(centerX, centerY + 70, 'BACK TO MENU', () => {
      this.cleanupAndReturn();
    });

    this.mainMenuContainer.add([createBtn, joinBtn, backBtn]);
  }

  // ---- Host UI (room code + rules panel + start game) ----

  private createHostUI(): void {
    const centerX = this.cameras.main.centerX;
    this.hostContainer = this.add.container(0, 0);

    // Room code at top
    const codeLabel = this.add.text(centerX, 195, 'ROOM CODE:', {
      fontSize: '20px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.roomCodeDisplay = this.add.text(centerX, 230, '----', {
      fontSize: '48px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    // Opponent status
    this.opponentStatusText = this.add.text(centerX, 265, 'Waiting for opponent...', {
      fontSize: '16px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.opponentStatusText,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.hostContainer.add([codeLabel, this.roomCodeDisplay, this.opponentStatusText]);

    // Rules panel
    this.createHostRulesPanel();

    // Start Game button (disabled by default)
    this.startGameBtn = this.add.container(centerX, 690);
    this.startGameBg = this.add.rectangle(0, 0, 320, 60, 0x444444);
    this.startGameBg.setStrokeStyle(3, 0x666666);
    this.startGameText = this.add.text(0, 0, 'START GAME', {
      fontSize: '24px',
      color: '#666666',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.startGameBtn.add([this.startGameBg, this.startGameText]);
    this.startGameBtn.setSize(320, 60);
    this.startGameBtn.setInteractive();

    this.startGameBtn.on('pointerup', () => {
      if (!this.canStartGame()) return;

      // Validate at least one rule
      const hasActiveRule = Object.values(this.rules).some(v => v === true);
      if (!hasActiveRule) {
        this.statusText.setText('Enable at least one rule!');
        this.time.delayedCall(2000, () => {
          if (this.statusText) this.statusText.setText('');
        });
        return;
      }

      saveRules(this.rules);
      // Tell server to start the game with selected rules
      this.socket.emit('startGame', {
        roomCode: this.myRoomCode,
        rules: this.rules,
      });
    });

    this.startGameBtn.on('pointerover', () => {
      if (this.canStartGame()) {
        this.startGameBg.setFillStyle(0xa0522d);
        this.startGameBtn.setScale(1.05);
      }
    });

    this.startGameBtn.on('pointerout', () => {
      if (this.canStartGame()) {
        this.startGameBg.setFillStyle(0x8B4513);
      } else {
        this.startGameBg.setFillStyle(0x444444);
      }
      this.startGameBtn.setScale(1);
    });

    // Cancel button
    const cancelBtn = this.createButton(centerX, 760, 'CANCEL', () => {
      this.socket.disconnect();
      this.connectSocket();
      this.showMainMenu();
    });

    this.hostContainer.add([this.startGameBtn, cancelBtn]);
    this.hostContainer.setVisible(false);
  }

  private createHostRulesPanel(): void {
    const centerX = this.cameras.main.centerX;
    const panelWidth = 820;
    const panelHeight = 370;
    const panelY = 290;

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

    this.hostContainer.add([panelBg, panelTitle]);

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

    // Reset defaults button
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
      this.updateStartButton();
    });

    this.hostContainer.add(resetBtn);
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
      this.updateStartButton();
    });

    this.ruleToggles.set(ruleKey, { box, checkmark });
    this.hostContainer.add(container);
  }

  private canStartGame(): boolean {
    const hasActiveRule = Object.values(this.rules).some(v => v === true);
    return this.opponentJoined && hasActiveRule;
  }

  private updateStartButton(): void {
    if (this.canStartGame()) {
      this.startGameBg.setFillStyle(0x8B4513);
      this.startGameBg.setStrokeStyle(3, 0xffd700);
      this.startGameText.setColor(COLORS.GOLD);
    } else {
      this.startGameBg.setFillStyle(0x444444);
      this.startGameBg.setStrokeStyle(3, 0x666666);
      this.startGameText.setColor('#666666');
    }
  }

  // ---- Waiting UI (for player 2 after joining — waiting for host to start) ----

  private createWaitingUI(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.waitingContainer = this.add.container(0, 0);

    const joinedLabel = this.add.text(centerX, centerY - 60, 'JOINED ROOM', {
      fontSize: '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const waitingText = this.add.text(centerX, centerY, 'Waiting for host to start the game...', {
      fontSize: '22px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: waitingText,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const cancelBtn = this.createButton(centerX, centerY + 80, 'LEAVE ROOM', () => {
      this.socket.disconnect();
      this.connectSocket();
      this.showMainMenu();
    });

    this.waitingContainer.add([joinedLabel, waitingText, cancelBtn]);
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

    if (this.isMobile) {
      // DOM input for mobile (triggers native keyboard)
      const inputHTML = `
        <input id="join-code-input" type="text" maxlength="4" autocomplete="off"
          style="width:240px; padding:12px; font-size:36px; font-weight:bold;
                 text-align:center; letter-spacing:12px; text-transform:uppercase;
                 background:#1a1a1a; color:#ffd700; border:3px solid #ffd700;
                 border-radius:4px; outline:none;" />
      `;
      this.joinDomElement = this.add.dom(centerX, centerY - 15).createFromHTML(inputHTML);
      this.joinDomElement.setDepth(200);

      const inputEl = this.joinDomElement.getChildByID('join-code-input') as HTMLInputElement;
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          inputEl.value = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
          this.joinInput = inputEl.value;
        });
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && this.joinInput.length === 4) {
            inputEl.blur();
            this.socket.emit('joinRoom', {
              roomCode: this.joinInput,
              userId: this.authUser?.userId,
              username: this.authUser?.username,
              token: this.authUser?.token,
            });
          }
        });
      }

      this.joinContainer.add([label]);
      // DOM element is added to the scene separately, not the container
    } else {
      // Phaser text input for desktop (original)
      const inputBg = this.add.rectangle(centerX, centerY - 20, 280, 60, 0x1a1a1a);
      inputBg.setStrokeStyle(3, 0xffd700);

      this.joinInputText = this.add.text(centerX, centerY - 20, '', {
        fontSize: '42px',
        color: COLORS.GOLD,
        fontStyle: 'bold',
        letterSpacing: 8
      }).setOrigin(0.5);

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

      this.joinContainer.add([label, inputBg, this.joinInputText, this.inputCursor]);
    }

    const joinBtn = this.createButton(centerX, centerY + 50, 'JOIN', () => {
      if (this.joinInput.length === 4) {
        this.socket.emit('joinRoom', {
          roomCode: this.joinInput,
          userId: this.authUser?.userId,
          username: this.authUser?.username,
          token: this.authUser?.token,
        });
      }
    });

    const backBtn = this.createButton(centerX, centerY + 120, 'BACK', () => {
      this.joinInput = '';
      this.isJoining = false;
      this.showMainMenu();
    });

    this.joinContainer.add([joinBtn, backBtn]);
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
      } else if (this.isWaiting || this.isHosting) {
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
        this.socket.emit('joinRoom', {
          roomCode: this.joinInput,
          userId: this.authUser?.userId,
          username: this.authUser?.username,
          token: this.authUser?.token,
        });
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

    // Host: room was created
    this.socket.on('roomCreated', (data: { roomCode: string; playerNumber: number }) => {
      console.log('[Lobby] Room created:', data.roomCode);
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = 1;
      this.roomCodeDisplay.setText(data.roomCode);
      this.opponentJoined = false;
      this.updateStartButton();
      this.showHostUI();
    });

    // Player 2: successfully joined a room
    this.socket.on('roomJoined', (data: { roomCode: string; playerNumber: number }) => {
      console.log('[Lobby] Joined room:', data.roomCode, 'as player', data.playerNumber);
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = data.playerNumber as 1 | 2;
      this.showWaitingUI();
    });

    // Host: notified that opponent has joined
    this.socket.on('playerJoined', (data: { message: string; playerCount: number }) => {
      console.log('[Lobby] Player joined:', data.message);
      this.opponentJoined = data.playerCount >= 2;
      if (this.opponentJoined) {
        this.opponentStatusText.setText('Opponent joined! Select rules and start.');
        this.opponentStatusText.setColor(COLORS.GREEN);
        this.tweens.killTweensOf(this.opponentStatusText);
        this.opponentStatusText.setAlpha(1);
      }
      this.updateStartButton();
    });

    // Host: notified that opponent left
    this.socket.on('playerLeft', (data: { message: string; playerCount: number }) => {
      console.log('[Lobby] Player left:', data.message);
      this.opponentJoined = data.playerCount >= 2;
      if (!this.opponentJoined && this.isHosting) {
        this.opponentStatusText.setText('Opponent left. Waiting for opponent...');
        this.opponentStatusText.setColor(COLORS.LIGHT_GRAY);
        this.tweens.add({
          targets: this.opponentStatusText,
          alpha: 0.4,
          duration: 800,
          yoyo: true,
          repeat: -1
        });
      }
      this.updateStartButton();
    });

    this.socket.on('roomError', (data: { message: string }) => {
      this.statusText.setText(data.message);
      this.time.delayedCall(3000, () => {
        if (this.statusText) this.statusText.setText('');
      });
    });

    this.socket.on('waitingForOpponent', (data: { message: string }) => {
      console.log('[Lobby]', data.message);
    });

    // Both: game is starting
    this.socket.on('gameStart', (data: { gameState: any; rules: any; playerInfo?: any }) => {
      console.log('[Lobby] Game starting! Room:', this.myRoomCode, 'Player:', this.myPlayerNumber);

      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.GAME, {
          rules: data.rules,
          multiplayer: true,
          playerNumber: this.myPlayerNumber,
          roomCode: this.myRoomCode,
          socket: this.socket,
          authUser: this.authUser,
          playerInfo: data.playerInfo || {},
        });
      });
    });
  }

  // ---- UI visibility helpers ----

  private showMainMenu(): void {
    this.isJoining = false;
    this.isWaiting = false;
    this.isHosting = false;
    this.opponentJoined = false;
    this.mainMenuContainer.setVisible(true);
    this.hostContainer.setVisible(false);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(false);
    if (this.joinDomElement) this.joinDomElement.setVisible(false);
    this.statusText.setText('');
  }

  private showHostUI(): void {
    this.isHosting = true;
    this.isWaiting = false;
    this.isJoining = false;
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(true);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(false);
    if (this.joinDomElement) this.joinDomElement.setVisible(false);
  }

  private showWaitingUI(): void {
    this.isWaiting = true;
    this.isHosting = false;
    this.isJoining = false;
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(false);
    this.waitingContainer.setVisible(true);
    this.joinContainer.setVisible(false);
    if (this.joinDomElement) this.joinDomElement.setVisible(false);
  }

  private showJoinUI(): void {
    this.isJoining = true;
    this.isWaiting = false;
    this.isHosting = false;
    this.joinInput = '';
    if (!this.isMobile) {
      this.updateJoinInputDisplay();
    } else if (this.joinDomElement) {
      this.joinDomElement.setVisible(true);
      const inputEl = this.joinDomElement.getChildByID('join-code-input') as HTMLInputElement;
      if (inputEl) inputEl.value = '';
    }
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(false);
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
    if (this.joinDomElement) {
      this.joinDomElement.destroy();
      this.joinDomElement = null;
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
