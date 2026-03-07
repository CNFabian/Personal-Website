import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, DEFAULT_RULES, GameRules } from '../common';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

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
  private rules: GameRules = { ...DEFAULT_RULES };

  // UI containers for show/hide
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private joinContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.LOBBY });
  }

  init(data: { rules?: GameRules }): void {
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

  // ---- Main menu (Create / Join buttons) ----

  private createMainMenu(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    this.mainMenuContainer = this.add.container(0, 0);

    const createBtn = this.createButton(centerX, centerY - 30, 'CREATE ROOM', () => {
      this.socket.emit('createRoom', { rules: this.rules });
    });

    const joinBtn = this.createButton(centerX, centerY + 50, 'JOIN ROOM', () => {
      this.showJoinUI();
    });

    const backBtn = this.createButton(centerX, centerY + 130, 'BACK TO MENU', () => {
      this.cleanupAndReturn();
    });

    this.mainMenuContainer.add([createBtn, joinBtn, backBtn]);
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
      this.roomCodeDisplay.setText(data.roomCode);
      this.showWaitingUI();
    });

    this.socket.on('roomJoined', (data: { roomCode: string; playerNumber: number }) => {
      console.log('[Lobby] Joined room:', data.roomCode, 'as player', data.playerNumber);
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
      console.log('[Lobby] Game starting!');

      // Determine our player number from the room
      const myPlayerNumber = this.getMyPlayerNumber();

      // Transition to game scene with multiplayer config
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.GAME, {
          rules: data.rules,
          multiplayer: true,
          playerNumber: myPlayerNumber,
          roomCode: this.roomCodeDisplay?.text || '',
          socket: this.socket, // Pass the socket directly
        });
      });
    });
  }

  private getMyPlayerNumber(): number {
    // If we created the room, we're player 1; if we joined, we're player 2
    // We track this via the isWaiting flag (creator waits)
    return this.isWaiting ? 1 : 2;
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
