import * as Phaser from 'phaser';
import { COLORS, AuthUser, isMobileDevice, isPortrait, AUTH_STORAGE_KEYS } from '../common';
import { io, Socket } from 'socket.io-client';
import { SPEED_GAME_SCENE_KEY } from './speed-game-scene';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const SPEED_LOBBY_SCENE_KEY = 'SpeedLobbyScene';

export class SpeedLobbyScene extends Phaser.Scene {
  private socket!: Socket;
  private statusText!: Phaser.GameObjects.Text;
  private roomCodeDisplay!: Phaser.GameObjects.Text;
  private joinInput: string = '';
  private joinInputText!: Phaser.GameObjects.Text;
  private inputCursor!: Phaser.GameObjects.Text;
  private cursorTimer!: Phaser.Time.TimerEvent;
  private isJoining = false;
  private isWaiting = false;
  private isHosting = false;
  private myRoomCode = '';
  private myPlayerNumber: 1 | 2 = 1;
  private authUser: AuthUser | null = null;
  private opponentJoined = false;

  private isMobile = false;
  private joinDomElement: Phaser.GameObjects.DOMElement | null = null;

  // UI containers
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private hostContainer!: Phaser.GameObjects.Container;
  private waitingContainer!: Phaser.GameObjects.Container;
  private joinContainer!: Phaser.GameObjects.Container;

  // Host UI elements
  private startGameBtn!: Phaser.GameObjects.Container;
  private startGameBg!: Phaser.GameObjects.Rectangle;
  private startGameText!: Phaser.GameObjects.Text;
  private opponentStatusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SPEED_LOBBY_SCENE_KEY });
  }

  init(data?: { authUser?: AuthUser | null }): void {
    this.authUser = data?.authUser || null;

    // Try to get auth from localStorage
    if (!this.authUser) {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
      const username = localStorage.getItem(AUTH_STORAGE_KEYS.USERNAME);
      const userId = localStorage.getItem('ratscrew_user_id');
      if (token && username) {
        this.authUser = {
          token,
          username,
          userId: userId ? parseInt(userId) : 0,
          wins: 0,
        };
      }
    }

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

    const portrait = isPortrait();
    const inset = portrait ? 25 : 50;
    const graphics = this.add.graphics();
    graphics.lineStyle(portrait ? 4 : 8, 0x8B4513);
    graphics.strokeRoundedRect(inset, inset,
      this.cameras.main.width - inset * 2,
      this.cameras.main.height - inset * 2, 20);
  }

  private createTitle(): void {
    const cx = this.cameras.main.centerX;
    const portrait = isPortrait();

    this.add.text(cx, portrait ? 70 : 100, 'SPEED — ONLINE', {
      fontSize: portrait ? '28px' : '42px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, portrait ? 105 : 150, 'Play against a friend in real-time', {
      fontSize: portrait ? '14px' : '18px',
      color: COLORS.WHITE,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    if (this.authUser) {
      const userX = this.cameras.main.width - (portrait ? 60 : 80);
      this.add.text(userX, portrait ? 45 : 75, this.authUser.username, {
        fontSize: portrait ? '13px' : '16px',
        color: COLORS.GOLD,
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  // ---- Main Menu ----

  private createMainMenu(): void {
    const cx = this.cameras.main.centerX;
    const portrait = isPortrait();
    const startY = portrait ? 180 : 240;

    this.mainMenuContainer = this.add.container(0, 0);

    const createBtn = this.createMenuButton(cx, startY, 'CREATE ROOM', 0x27AE60, () => this.onCreateRoom());
    const joinBtn = this.createMenuButton(cx, startY + (portrait ? 65 : 80), 'JOIN ROOM', 0x2980B9, () => this.showJoinUI());
    const backBtn = this.createMenuButton(cx, startY + (portrait ? 130 : 160), '← BACK', 0x7F8C8D, () => {
      window.location.href = '/casino';
    });

    this.mainMenuContainer.add([createBtn, joinBtn, backBtn]);
  }

  // ---- Host UI ----

  private createHostUI(): void {
    const cx = this.cameras.main.centerX;
    const portrait = isPortrait();
    const startY = portrait ? 170 : 210;

    this.hostContainer = this.add.container(0, 0);
    this.hostContainer.setVisible(false);

    const roomLabel = this.add.text(cx, startY, 'ROOM CODE', {
      fontSize: portrait ? '16px' : '20px',
      color: COLORS.LIGHT_GRAY,
    }).setOrigin(0.5);

    this.roomCodeDisplay = this.add.text(cx, startY + (portrait ? 40 : 50), '----', {
      fontSize: portrait ? '48px' : '64px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      fontFamily: 'Courier, monospace',
      letterSpacing: 10,
    }).setOrigin(0.5);

    this.opponentStatusText = this.add.text(cx, startY + (portrait ? 90 : 110), 'Waiting for opponent...', {
      fontSize: portrait ? '14px' : '18px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Start Game button
    const btnW = portrait ? 180 : 220;
    const btnH = portrait ? 50 : 60;
    const btnY = startY + (portrait ? 150 : 190);

    this.startGameBg = this.add.rectangle(cx, btnY, btnW, btnH, 0x555555);
    this.startGameBg.setStrokeStyle(2, 0x888888);

    this.startGameText = this.add.text(cx, btnY, 'START GAME', {
      fontSize: portrait ? '16px' : '20px',
      color: '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.startGameBtn = this.add.container(cx, btnY);
    this.startGameBtn.setSize(btnW, btnH);
    this.startGameBtn.setInteractive({ useHandCursor: false });
    this.startGameBtn.on('pointerdown', () => {
      if (this.opponentJoined) this.onStartGame();
    });

    const cancelBtn = this.createMenuButton(cx, btnY + (portrait ? 60 : 75), 'CANCEL', 0xC0392B, () => {
      this.socket?.disconnect();
      this.showMainMenu();
    });

    this.hostContainer.add([roomLabel, this.roomCodeDisplay, this.opponentStatusText,
      this.startGameBg, this.startGameText, this.startGameBtn, cancelBtn]);
  }

  // ---- Waiting UI (Player 2) ----

  private createWaitingUI(): void {
    const cx = this.cameras.main.centerX;
    const portrait = isPortrait();
    const startY = portrait ? 260 : 320;

    this.waitingContainer = this.add.container(0, 0);
    this.waitingContainer.setVisible(false);

    const waitText = this.add.text(cx, startY, 'Waiting for host to start...', {
      fontSize: portrait ? '16px' : '20px',
      color: COLORS.GOLD,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const cancelBtn = this.createMenuButton(cx, startY + (portrait ? 50 : 60), 'LEAVE', 0xC0392B, () => {
      this.socket?.disconnect();
      this.showMainMenu();
    });

    this.waitingContainer.add([waitText, cancelBtn]);
  }

  // ---- Join UI ----

  private createJoinUI(): void {
    const cx = this.cameras.main.centerX;
    const portrait = isPortrait();
    const startY = portrait ? 200 : 260;

    this.joinContainer = this.add.container(0, 0);
    this.joinContainer.setVisible(false);

    const label = this.add.text(cx, startY, 'ENTER ROOM CODE', {
      fontSize: portrait ? '16px' : '20px',
      color: COLORS.LIGHT_GRAY,
    }).setOrigin(0.5);

    if (this.isMobile) {
      // DOM input for mobile keyboard
      const html = `<input type="text" maxlength="4" placeholder="CODE"
        style="font-size:28px;text-align:center;width:180px;padding:10px;
        background:#1a3a2a;color:#FFD700;border:2px solid #FFD700;
        border-radius:8px;font-family:Courier,monospace;text-transform:uppercase;" />`;
      this.joinDomElement = this.add.dom(cx, startY + 55).createFromHTML(html);
      this.joinContainer.add(this.joinDomElement);
    } else {
      // Text input display
      const inputBg = this.add.rectangle(cx, startY + 50, 200, 50, 0x1a3a2a);
      inputBg.setStrokeStyle(2, 0xFFD700);

      this.joinInputText = this.add.text(cx, startY + 50, '', {
        fontSize: '32px',
        color: COLORS.GOLD,
        fontFamily: 'Courier, monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.inputCursor = this.add.text(cx + 5, startY + 50, '|', {
        fontSize: '32px',
        color: COLORS.GOLD,
      }).setOrigin(0, 0.5);

      this.cursorTimer = this.time.addEvent({
        delay: 500,
        callback: () => {
          if (this.inputCursor) this.inputCursor.setVisible(!this.inputCursor.visible);
        },
        loop: true,
      });

      this.joinContainer.add([inputBg, this.joinInputText, this.inputCursor]);
    }

    const joinBtn = this.createMenuButton(cx, startY + (portrait ? 115 : 130), 'JOIN', 0x2980B9, () => this.onJoinRoom());
    const backBtn = this.createMenuButton(cx, startY + (portrait ? 175 : 200), '← BACK', 0x7F8C8D, () => this.showMainMenu());

    this.joinContainer.add([label, joinBtn, backBtn]);
  }

  // ---- Status Bar ----

  private createStatusBar(): void {
    const portrait = isPortrait();
    this.statusText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - (portrait ? 30 : 40),
      '',
      { fontSize: portrait ? '12px' : '14px', color: COLORS.WHITE, align: 'center' }
    ).setOrigin(0.5).setDepth(50);
  }

  // ---- Keyboard (for join input) ----

  private setupKeyboard(): void {
    if (this.isMobile) return;

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isJoining) return;

      if (event.key === 'Backspace') {
        this.joinInput = this.joinInput.slice(0, -1);
        this.updateJoinInputDisplay();
      } else if (event.key === 'Enter' && this.joinInput.length === 4) {
        this.onJoinRoom();
      } else if (/^[a-zA-Z0-9]$/.test(event.key) && this.joinInput.length < 4) {
        this.joinInput += event.key.toUpperCase();
        this.updateJoinInputDisplay();
      }
    });
  }

  private updateJoinInputDisplay(): void {
    if (this.joinInputText) {
      this.joinInputText.setText(this.joinInput);
      const textWidth = this.joinInputText.width;
      if (this.inputCursor) {
        this.inputCursor.x = this.cameras.main.centerX + textWidth / 2 + 5;
      }
    }
  }

  // ---- Socket ----

  private connectSocket(): void {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.statusText.setText('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.statusText.setText('Disconnected from server');
    });

    this.socket.on('roomCreated', (data: { roomCode: string; playerNumber: number }) => {
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = data.playerNumber as 1 | 2;
      this.roomCodeDisplay.setText(data.roomCode);
    });

    this.socket.on('roomJoined', (data: { roomCode: string; playerNumber: number }) => {
      this.myRoomCode = data.roomCode;
      this.myPlayerNumber = data.playerNumber as 1 | 2;
      this.showWaitingUI();
      this.statusText.setText(`Joined room ${data.roomCode} as Player ${data.playerNumber}`);
    });

    this.socket.on('playerJoined', (data: { message: string; playerCount: number }) => {
      this.opponentJoined = true;
      if (this.isHosting) {
        this.opponentStatusText.setText('Opponent connected!');
        this.startGameBg.setFillStyle(0x27AE60);
        this.startGameBg.setStrokeStyle(2, 0x2ECC71);
        this.startGameText.setColor('#FFFFFF');
        this.startGameBtn.setInteractive({ useHandCursor: true });
      }
      this.statusText.setText(data.message);
    });

    this.socket.on('playerLeft', (data: { message: string; playerCount: number }) => {
      this.opponentJoined = false;
      if (this.isHosting) {
        this.opponentStatusText.setText('Waiting for opponent...');
        this.startGameBg.setFillStyle(0x555555);
        this.startGameBg.setStrokeStyle(2, 0x888888);
        this.startGameText.setColor('#888888');
        this.startGameBtn.setInteractive({ useHandCursor: false });
      }
      this.statusText.setText(data.message);
    });

    this.socket.on('waitingForOpponent', (data: { message: string }) => {
      this.statusText.setText(data.message);
    });

    this.socket.on('roomError', (data: { message: string }) => {
      this.statusText.setText(`Error: ${data.message}`);
    });

    this.socket.on('gameStart', (data: { gameState: any; playerInfo: any }) => {
      // Transition to game scene
      this.scene.start(SPEED_GAME_SCENE_KEY, {
        multiplayer: true,
        playerNumber: this.myPlayerNumber,
        roomCode: this.myRoomCode,
        socket: this.socket,
        authUser: this.authUser,
        playerInfo: data.playerInfo,
      });
    });
  }

  // ---- Actions ----

  private onCreateRoom(): void {
    this.isHosting = true;
    this.showHostUI();

    this.socket.emit('createSpeedRoom', {
      userId: this.authUser?.userId,
      username: this.authUser?.username,
      token: localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN),
    });
  }

  private onJoinRoom(): void {
    let code = '';
    if (this.isMobile && this.joinDomElement) {
      const input = this.joinDomElement.node.querySelector('input') as HTMLInputElement;
      code = (input?.value || '').toUpperCase().trim();
    } else {
      code = this.joinInput.toUpperCase().trim();
    }

    if (code.length !== 4) {
      this.statusText.setText('Enter a 4-character room code');
      return;
    }

    this.socket.emit('joinSpeedRoom', {
      roomCode: code,
      userId: this.authUser?.userId,
      username: this.authUser?.username,
      token: localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN),
    });
  }

  private onStartGame(): void {
    this.socket.emit('startSpeedGame', {
      roomCode: this.myRoomCode,
    });
  }

  // ---- UI State Switching ----

  private showMainMenu(): void {
    this.mainMenuContainer.setVisible(true);
    this.hostContainer.setVisible(false);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(false);
    this.isJoining = false;
    this.isWaiting = false;
    this.isHosting = false;
  }

  private showHostUI(): void {
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(true);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(false);
    this.isJoining = false;
    this.isWaiting = false;
  }

  private showJoinUI(): void {
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(false);
    this.waitingContainer.setVisible(false);
    this.joinContainer.setVisible(true);
    this.isJoining = true;
    this.joinInput = '';
    if (this.joinInputText) this.joinInputText.setText('');
  }

  private showWaitingUI(): void {
    this.mainMenuContainer.setVisible(false);
    this.hostContainer.setVisible(false);
    this.waitingContainer.setVisible(true);
    this.joinContainer.setVisible(false);
    this.isJoining = false;
    this.isWaiting = true;
  }

  // ---- Button helper ----

  private createMenuButton(x: number, y: number, label: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const portrait = isPortrait();
    const container = this.add.container(x, y).setDepth(30);
    const bw = portrait ? 200 : 260;
    const bh = portrait ? 45 : 55;

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
