import * as Phaser from 'phaser';
import { SCENE_KEYS, ASSET_KEYS, COLORS, CARD_SCALE, CARD_WIDTH, CARD_HEIGHT, GameState, Player, Suit, GameRules, RULE_NAMES, AuthUser, isMobileDevice, isPortrait } from '../common';
import { RatScrew } from '../lib/ratscrew';
import { Card } from '../lib/card';
import type { Socket } from 'socket.io-client';

// Shape of the serialised state that the server sends
interface ServerGameState {
  player1Count: number;
  player2Count: number;
  centerCount: number;
  bonusCount: number;
  topCard: { suit: string; rank: string; displayValue: string; displaySuit: string } | null;
  currentPlayer: 1 | 2;
  gameState: string;
  winner: 1 | 2 | null;
  challengePlayer: 1 | 2 | null;
  challengeRemaining: number;
  pileAwaitingCollection: boolean;
  pileWinner: 1 | 2 | null;
  statusMessage: string;
  lastAction: { type: string; player: number } | null;
}

interface PlayerInfo {
  username: string;
  wins?: number;
}

interface GameSceneData {
  rules?: GameRules;
  multiplayer?: boolean;
  playerNumber?: 1 | 2;
  roomCode?: string;
  socket?: Socket;
  authUser?: AuthUser | null;
  playerInfo?: Record<number, PlayerInfo>;
}

export class GameScene extends Phaser.Scene {
  private game_logic!: RatScrew;
  private player1DeckSprite!: Phaser.GameObjects.Image;
  private player2DeckSprite!: Phaser.GameObjects.Image;
  private centerCardSprite!: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  private bonusPileSprite!: Phaser.GameObjects.Rectangle;

  // UI Text elements
  private player1CountText!: Phaser.GameObjects.Text;
  private player2CountText!: Phaser.GameObjects.Text;
  private centerCountText!: Phaser.GameObjects.Text;
  private bonusCountText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;
  private challengeText!: Phaser.GameObjects.Text;
  private pileCollectionText!: Phaser.GameObjects.Text;

  // Active rules display
  private activeRulesContainer!: Phaser.GameObjects.Container;

  // Easy/Hard mode toggle
  private isEasyMode: boolean = true;
  private modeToggleText!: Phaser.GameObjects.Text;

  private usingSprites: boolean = false;

  // ---- Multiplayer state ----
  private isMultiplayer: boolean = false;
  private myPlayerNumber: 1 | 2 = 1;
  private roomCode: string = '';
  private socket: Socket | null = null;
  private lastServerState: ServerGameState | null = null;
  private disconnectOverlay: Phaser.GameObjects.Container | null = null;
  private winScreenShown: boolean = false;

  // ---- Auth / player info ----
  private authUser: AuthUser | null = null;
  private playerInfo: Record<number, PlayerInfo> = {};
  private player1NameText!: Phaser.GameObjects.Text;
  private player2NameText!: Phaser.GameObjects.Text;

  // ---- Mobile touch ----
  private isMobile: boolean = false;
  private playButton!: Phaser.GameObjects.Container;
  private slapButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data: GameSceneData): void {
    // Store the rules passed from the rules/lobby scene
    if (data?.rules) {
      console.log('Game started with rules:', data.rules);
    }

    // Multiplayer config
    this.isMultiplayer = !!data?.multiplayer;
    this.myPlayerNumber = data?.playerNumber || 1;
    this.roomCode = data?.roomCode || '';
    this.socket = data?.socket || null;
    this.lastServerState = null;
    this.disconnectOverlay = null;
    this.winScreenShown = false;

    // Auth / player info
    this.authUser = data?.authUser || null;
    this.playerInfo = data?.playerInfo || {};

    // Mobile detection
    this.isMobile = isMobileDevice();
  }

  create(): void {
    this.checkAssets();
    this.createBackground();
    this.initializeGame();
    this.createUI();
    this.createActiveRulesDisplay();
    this.setupInput();

    if (this.isMobile) {
      this.createTouchButtons();
    }

    if (this.isMultiplayer) {
      this.setupMultiplayer();
    } else {
      this.updateDisplay();
    }
  }

  private checkAssets(): void {
    this.usingSprites = this.textures.exists(ASSET_KEYS.CARDS);
    if (!this.usingSprites) {
      console.warn('Card sprites not found, using fallback rectangles');
    }
  }

  private createBackground(): void {
    // Main background
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x0a5f38
    );

    // Decorative border
    const graphics = this.add.graphics();
    graphics.lineStyle(8, 0x8B4513);
    graphics.strokeRoundedRect(
      50, 50,
      this.cameras.main.width - 100,
      this.cameras.main.height - 100,
      20
    );

    this.createPlayingAreas();
  }

  /** Get layout positions based on portrait/landscape */
  private getLayout() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    if (this.isMobile) {
      // Portrait: 600x1000
      return {
        centerCard: { x: cx, y: 420 },
        player1Deck: { x: cx, y: 660 },
        player2Deck: { x: cx, y: 190 },
        bonusPile: { x: 120, y: 420 },
        player1Count: { x: cx, y: 730 },
        player2Count: { x: cx, y: 260 },
        player1Name: { x: cx, y: 750 },
        player2Name: { x: cx, y: 130 },
        centerCount: { x: cx, y: 490 },
        bonusCount: { x: 120, y: 490 },
        turnIndicator: { x: cx, y: 80 },
        challengeText: { x: cx, y: 105 },
        statusText: { x: cx, y: 560 },
        pileCollection: { x: cx, y: 340 },
        controlHint: { x: cx, y: h - 15 },
        modeToggle: { x: w - 15, y: 15 },
        leaveBtn: { x: w - 60, y: 55 },
        activeRules: { x: 55, y: 55 },
      };
    } else {
      // Landscape: 1200x800
      return {
        centerCard: { x: cx, y: cy },
        player1Deck: { x: 178, y: h - 200 },
        player2Deck: { x: w - 200, y: 188 },
        bonusPile: { x: w - 372, y: cy },
        player1Count: { x: 180, y: h - 125 },
        player2Count: { x: w - 200, y: 115 },
        player1Name: { x: 180, y: h - 155 },
        player2Name: { x: w - 200, y: 85 },
        centerCount: { x: cx, y: cy + 80 },
        bonusCount: { x: w - 375, y: cy + 80 },
        turnIndicator: { x: cx, y: 100 },
        challengeText: { x: cx, y: 130 },
        statusText: { x: cx, y: h - 100 },
        pileCollection: { x: cx, y: cy - 100 },
        controlHint: { x: cx, y: h - 30 },
        modeToggle: { x: w - 20, y: 20 },
        leaveBtn: { x: w - 90, y: 60 },
        activeRules: { x: 75, y: 75 },
      };
    }
  }

  private createPlayingAreas(): void {
    const L = this.getLayout();
    const cw = CARD_WIDTH * CARD_SCALE;
    const ch = CARD_HEIGHT * CARD_SCALE;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffd700, 0.5);

    // Center pile area
    graphics.strokeRoundedRect(L.centerCard.x - cw / 2 - 10, L.centerCard.y - ch / 2 - 10, cw + 20, ch + 20, 5);
    // Player 1 deck area
    graphics.strokeRoundedRect(L.player1Deck.x - cw / 2 - 10, L.player1Deck.y - ch / 2 - 10, cw + 20, ch + 20, 5);
    // Player 2 deck area
    graphics.strokeRoundedRect(L.player2Deck.x - cw / 2 - 10, L.player2Deck.y - ch / 2 - 10, cw + 20, ch + 20, 5);
    // Bonus pile area
    graphics.strokeRoundedRect(L.bonusPile.x - cw / 2 - 10, L.bonusPile.y - ch / 2 - 10, cw + 20, ch + 20, 5);
  }

  private initializeGame(): void {
    // Get rules from scene data or use defaults
    const sceneData = this.scene.settings.data as GameSceneData;
    const rules = sceneData?.rules;

    // In multiplayer the server is the source of truth, but we still create
    // a local RatScrew instance for the active-rules display helper.
    this.game_logic = new RatScrew(rules);
  }

  private createActiveRulesDisplay(): void {
    const L = this.getLayout();
    // Container for active rules display
    this.activeRulesContainer = this.add.container(L.activeRules.x, L.activeRules.y);

    // Get active rules from game logic
    const activeRuleNames = this.game_logic.getActiveRuleNames();
    const rulesText = activeRuleNames.length > 0
      ? activeRuleNames.join('\n')
      : 'No rules active';

    // Portrait uses smaller fonts
    const titleFontSize = this.isMobile ? '12px' : '16px';
    const rulesFontSize = this.isMobile ? '10px' : '14px';
    const titleHeight = this.isMobile ? 18 : 25;
    const lineHeight = this.isMobile ? 14 : 18;
    const padding = this.isMobile ? 14 : 20;
    const minWidth = this.isMobile ? 130 : 200;
    const maxWidth = this.isMobile ? 180 : 300;

    // Calculate dimensions
    const numLines = activeRuleNames.length || 1;
    const textHeight = numLines * lineHeight;
    const panelHeight = titleHeight + textHeight + padding;

    // Calculate width based on longest rule name
    const longestRule = activeRuleNames.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
      'ACTIVE RULES'
    );
    const charWidth = this.isMobile ? 6 : 8;
    const estimatedWidth = Math.max(minWidth, longestRule.length * charWidth + 30);
    const panelWidth = Math.min(estimatedWidth, maxWidth);

    // Background panel for rules
    const panel = this.add.rectangle(
      panelWidth / 2,
      panelHeight / 2,
      panelWidth,
      panelHeight,
      0x000000,
      0.7
    );
    panel.setStrokeStyle(2, 0xffd700);

    // Title
    const title = this.add.text(
      panelWidth / 2,
      this.isMobile ? 8 : 15,
      'ACTIVE RULES',
      {
        fontSize: titleFontSize,
        color: COLORS.GOLD,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    // Rules display
    const rulesDisplay = this.add.text(
      panelWidth / 2,
      titleHeight + (this.isMobile ? 5 : 10),
      rulesText,
      {
        fontSize: rulesFontSize,
        color: COLORS.WHITE,
        align: 'center',
        lineSpacing: 2
      }
    ).setOrigin(0.5, 0);

    // Add elements to container
    this.activeRulesContainer.add([panel, title, rulesDisplay]);

    // Make sure it's on top
    this.activeRulesContainer.setDepth(100);
  }

  private createUI(): void {
    const L = this.getLayout();

    // Create card sprites
    this.centerCardSprite = this.createCardDisplay(L.centerCard.x, L.centerCard.y, null);
    this.player1DeckSprite = this.createCardDisplay(L.player1Deck.x, L.player1Deck.y, null) as any;
    this.player2DeckSprite = this.createCardDisplay(L.player2Deck.x, L.player2Deck.y, null) as any;

    // Bonus pile (initially hidden)
    this.bonusPileSprite = this.add.rectangle(
      L.bonusPile.x,
      L.bonusPile.y,
      CARD_WIDTH * CARD_SCALE,
      CARD_HEIGHT * CARD_SCALE,
      0x4169E1
    );
    this.bonusPileSprite.setStrokeStyle(2, 0x000080);
    this.bonusPileSprite.setVisible(false);

    const countFontSize = this.isMobile ? '15px' : '18px';
    const nameFontSize = this.isMobile ? '12px' : '14px';

    // Card count displays
    this.player1CountText = this.add.text(L.player1Count.x, L.player1Count.y, 'Cards: 26', {
      fontSize: countFontSize,
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.player2CountText = this.add.text(L.player2Count.x, L.player2Count.y, 'Cards: 26', {
      fontSize: countFontSize,
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Player name / win count labels (multiplayer only)
    if (this.isMultiplayer) {
      const p1Info = this.playerInfo[1];
      const p2Info = this.playerInfo[2];
      const p1Label = p1Info
        ? `${p1Info.username}${p1Info.wins != null ? ` (${p1Info.wins} wins)` : ''}`
        : 'Player 1';
      const p2Label = p2Info
        ? `${p2Info.username}${p2Info.wins != null ? ` (${p2Info.wins} wins)` : ''}`
        : 'Player 2';

      this.player1NameText = this.add.text(L.player1Name.x, L.player1Name.y, p1Label, {
        fontSize: nameFontSize,
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.player2NameText = this.add.text(L.player2Name.x, L.player2Name.y, p2Label, {
        fontSize: nameFontSize,
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    this.centerCountText = this.add.text(L.centerCount.x, L.centerCount.y, 'Center: 0', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.bonusCountText = this.add.text(L.bonusCount.x, L.bonusCount.y, 'Bonus: 0', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Status and instructions
    this.statusText = this.add.text(L.statusText.x, L.statusText.y, 'Game ready', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.turnIndicator = this.add.text(L.turnIndicator.x, L.turnIndicator.y, "Player 1's Turn", {
      fontSize: this.isMobile ? '20px' : '24px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.challengeText = this.add.text(L.challengeText.x, L.challengeText.y, '', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.RED,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pile collection indicator (initially hidden)
    this.pileCollectionText = this.add.text(L.pileCollection.x, L.pileCollection.y, '', {
      fontSize: this.isMobile ? '16px' : '20px',
      color: COLORS.GREEN,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);
    this.pileCollectionText.setVisible(false);

    // Control instructions — change text based on multiplayer and mobile
    let controlHint: string;
    if (this.isMobile) {
      controlHint = this.isMultiplayer
        ? `Player ${this.myPlayerNumber} | Room: ${this.roomCode}`
        : '';
    } else {
      controlHint = this.isMultiplayer
        ? `You are Player ${this.myPlayerNumber} | Q=Play, A=Slap | Room: ${this.roomCode} | ESC=Leave`
        : 'Player 1: Q=Play, A=Slap | Player 2: P=Play, L=Slap | ESC=Menu';
    }

    if (controlHint) {
      this.add.text(L.controlHint.x, L.controlHint.y, controlHint, {
        fontSize: this.isMobile ? '11px' : '14px',
        color: COLORS.LIGHT_GRAY
      }).setOrigin(0.5);
    }

    // Mode toggle — hide on mobile (not useful with touch)
    if (!this.isMobile) {
      this.modeToggleText = this.add.text(
        L.modeToggle.x,
        L.modeToggle.y,
        this.isEasyMode ? 'EASY MODE\n(Press M to toggle)' : 'HARD MODE\n(Press M to toggle)',
        {
          fontSize: '14px',
          color: this.isEasyMode ? COLORS.GREEN : COLORS.RED,
          fontStyle: 'bold',
          align: 'right',
          lineSpacing: 2
        }
      ).setOrigin(1.25, -24.2);
    } else {
      // Create a minimal mode text for portrait
      this.modeToggleText = this.add.text(0, 0, '', { fontSize: '1px', color: '#000' });
      this.modeToggleText.setVisible(false);
    }
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    if (this.isMultiplayer) {
      // In multiplayer: Q = play, A = slap — always for your own player
      this.input.keyboard.on('keydown-Q', () => this.handleMultiplayerPlay());
      this.input.keyboard.on('keydown-A', () => this.handleMultiplayerSlap());

      // Also allow P/L as alternatives (since they're on separate machines)
      this.input.keyboard.on('keydown-P', () => this.handleMultiplayerPlay());
      this.input.keyboard.on('keydown-L', () => this.handleMultiplayerSlap());
    } else {
      // Local 2-player controls (unchanged)
      this.input.keyboard.on('keydown-Q', () => this.playCard(1));
      this.input.keyboard.on('keydown-A', () => this.attemptSlap(1));
      this.input.keyboard.on('keydown-P', () => this.playCard(2));
      this.input.keyboard.on('keydown-L', () => this.attemptSlap(2));
    }

    // Mode toggle
    this.input.keyboard.on('keydown-M', () => this.toggleMode());

    // Menu / Leave
    this.input.keyboard.on('keydown-ESC', () => this.returnToMenu());
  }

  // ================================================================
  // Mobile touch buttons
  // ================================================================

  private createTouchButtons(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = this.cameras.main.centerX;

    // Portrait: stacked vertically; Landscape: side by side
    const btnW = this.isMobile ? 280 : 260;
    const btnH = this.isMobile ? 65 : 90;
    const playBtnX = this.isMobile ? cx : (w / 2 - btnW / 2 - 15);
    const playBtnY = this.isMobile ? 830 : (h - 70);
    const slapBtnX = this.isMobile ? cx : (w / 2 + btnW / 2 + 15);
    const slapBtnY = this.isMobile ? 905 : (h - 70);

    // ---- PLAY CARD button ----
    this.playButton = this.add.container(playBtnX, playBtnY);
    const playBg = this.add.rectangle(0, 0, btnW, btnH, 0x2a5a2a);
    playBg.setStrokeStyle(4, 0xffd700);
    const playLabel = this.add.text(0, 0, this.isMobile ? 'PLAY CARD' : 'PLAY\nCARD', {
      fontSize: this.isMobile ? '24px' : '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2
    }).setOrigin(0.5);
    this.playButton.add([playBg, playLabel]);
    this.playButton.setSize(btnW, btnH);
    this.playButton.setInteractive();
    this.playButton.setDepth(500);

    this.playButton.on('pointerdown', () => {
      playBg.setFillStyle(0x1a3a1a);
      this.playButton.setScale(0.95);
    });
    this.playButton.on('pointerup', () => {
      playBg.setFillStyle(0x2a5a2a);
      this.playButton.setScale(1);
      if (this.isMultiplayer) {
        this.handleMultiplayerPlay();
      } else {
        this.playCard(1);
      }
    });
    this.playButton.on('pointerout', () => {
      playBg.setFillStyle(0x2a5a2a);
      this.playButton.setScale(1);
    });

    // ---- SLAP button ----
    this.slapButton = this.add.container(slapBtnX, slapBtnY);
    const slapBg = this.add.rectangle(0, 0, btnW, btnH, 0x8B0000);
    slapBg.setStrokeStyle(4, 0xff4444);
    const slapLabel = this.add.text(0, 0, 'SLAP!', {
      fontSize: this.isMobile ? '26px' : '32px',
      color: '#ff4444',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    this.slapButton.add([slapBg, slapLabel]);
    this.slapButton.setSize(btnW, btnH);
    this.slapButton.setInteractive();
    this.slapButton.setDepth(500);

    this.slapButton.on('pointerdown', () => {
      slapBg.setFillStyle(0x5a0000);
      this.slapButton.setScale(0.95);
    });
    this.slapButton.on('pointerup', () => {
      slapBg.setFillStyle(0x8B0000);
      this.slapButton.setScale(1);
      if (this.isMultiplayer) {
        this.handleMultiplayerSlap();
      } else {
        this.attemptSlap(1);
      }
    });
    this.slapButton.on('pointerout', () => {
      slapBg.setFillStyle(0x8B0000);
      this.slapButton.setScale(1);
    });

    // ---- Back/Leave button (small, top-right) ----
    const L = this.getLayout();
    const backBtn = this.add.container(L.leaveBtn.x, L.leaveBtn.y);
    const leaveBtnW = this.isMobile ? 80 : 120;
    const leaveBtnH = this.isMobile ? 32 : 40;
    const backBg = this.add.rectangle(0, 0, leaveBtnW, leaveBtnH, 0x333333);
    backBg.setStrokeStyle(2, 0x666666);
    const backLabel = this.add.text(0, 0, 'LEAVE', {
      fontSize: this.isMobile ? '13px' : '16px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.add([backBg, backLabel]);
    backBtn.setSize(leaveBtnW, leaveBtnH);
    backBtn.setInteractive();
    backBtn.setDepth(500);
    backBtn.on('pointerup', () => {
      this.returnToMenu();
    });
  }

  // ================================================================
  // Multiplayer — Socket.io setup & handlers
  // ================================================================

  private setupMultiplayer(): void {
    if (!this.socket) {
      console.error('[GameScene] No socket provided for multiplayer');
      return;
    }

    console.log(`[GameScene] Multiplayer mode: Player ${this.myPlayerNumber}, Room ${this.roomCode}`);

    // Listen for game state updates from the server
    this.socket.on('gameStateUpdate', (state: ServerGameState) => {
      this.lastServerState = state;
      this.updateDisplayFromServerState(state);
    });

    // Listen for opponent disconnect
    this.socket.on('opponentDisconnected', (data: { message: string }) => {
      this.showDisconnectOverlay(data.message);
    });

    // Listen for room errors (e.g. room closed)
    this.socket.on('roomError', (data: { message: string }) => {
      this.showDisconnectOverlay(data.message);
    });

    // Listen for win recorded (updated win counts)
    this.socket.on('winRecorded', (winData: Record<number, { username: string; wins: number }>) => {
      // Update stored playerInfo with new win counts
      for (const [playerNum, data] of Object.entries(winData)) {
        const pn = Number(playerNum);
        if (this.playerInfo[pn]) {
          this.playerInfo[pn].wins = data.wins;
        } else {
          this.playerInfo[pn] = { username: data.username, wins: data.wins };
        }
      }
      // Update the name labels
      this.updatePlayerNameLabels();
    });

    // Listen for game restart
    this.socket.on('gameStart', (data: { gameState: ServerGameState; rules: any }) => {
      this.winScreenShown = false;
      if (this.disconnectOverlay) {
        this.disconnectOverlay.destroy();
        this.disconnectOverlay = null;
      }
      this.lastServerState = data.gameState;
      this.updateDisplayFromServerState(data.gameState);
    });
  }

  private updatePlayerNameLabels(): void {
    if (!this.isMultiplayer) return;

    const p1Info = this.playerInfo[1];
    const p2Info = this.playerInfo[2];

    if (this.player1NameText && p1Info) {
      this.player1NameText.setText(
        `${p1Info.username}${p1Info.wins != null ? ` (${p1Info.wins} wins)` : ''}`
      );
    }
    if (this.player2NameText && p2Info) {
      this.player2NameText.setText(
        `${p2Info.username}${p2Info.wins != null ? ` (${p2Info.wins} wins)` : ''}`
      );
    }
  }

  private handleMultiplayerPlay(): void {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('playCard', { roomCode: this.roomCode, player: this.myPlayerNumber });
    // Do NOT update local state — wait for server
  }

  private handleMultiplayerSlap(): void {
    if (!this.socket || !this.roomCode) return;
    this.socket.emit('attemptSlap', { roomCode: this.roomCode, player: this.myPlayerNumber });
  }

  // ================================================================
  // Display update from server state (multiplayer)
  // ================================================================

  private updateDisplayFromServerState(state: ServerGameState): void {
    // Update card counts
    this.player1CountText.setText(`Cards: ${state.player1Count}`);
    this.player2CountText.setText(`Cards: ${state.player2Count}`);
    this.centerCountText.setText(`Center: ${state.centerCount}`);

    // Bonus pile
    this.bonusCountText.setText(`Bonus: ${state.bonusCount}`);
    this.bonusPileSprite.setVisible(state.bonusCount > 0);

    // Status message
    if (this.isEasyMode) {
      this.statusText.setText(state.statusMessage);
    } else {
      if (!this.isRuleHintMessage(state.statusMessage)) {
        this.statusText.setText(state.statusMessage);
      }
    }

    // Pile collection indicator
    if (state.pileAwaitingCollection && state.pileWinner) {
      const isMe = state.pileWinner === this.myPlayerNumber;
      const label = isMe ? 'YOU: SLAP TO COLLECT!' : `Player ${state.pileWinner}: SLAP TO COLLECT!`;
      this.pileCollectionText.setText(label);
      this.pileCollectionText.setVisible(true);

      this.tweens.killTweensOf(this.pileCollectionText);
      this.tweens.add({
        targets: this.pileCollectionText,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.pileCollectionText.setVisible(false);
      this.tweens.killTweensOf(this.pileCollectionText);
      this.pileCollectionText.setScale(1);
    }

    // Turn indicator
    if (state.gameState === 'PLAYING') {
      const isMeTurn = state.currentPlayer === this.myPlayerNumber;
      this.turnIndicator.setText(isMeTurn ? 'YOUR TURN' : "Opponent's Turn");
      this.challengeText.setText('');
    } else if (state.gameState === 'CHALLENGE') {
      this.turnIndicator.setText('Challenge Mode');
      const isMeChallenge = state.challengePlayer === this.myPlayerNumber;
      this.challengeText.setText(
        isMeChallenge
          ? `YOU have ${state.challengeRemaining} chances`
          : `Opponent has ${state.challengeRemaining} chances`
      );
    } else if (state.gameState === 'GAME_OVER' && !this.winScreenShown) {
      this.winScreenShown = true;
      this.turnIndicator.setText('GAME OVER!');
      const iWon = state.winner === this.myPlayerNumber;
      this.challengeText.setText(iWon ? 'YOU WIN!' : 'YOU LOSE!');
      this.showWinScreenMultiplayer(state);
    }

    // Update center card from server state
    const L = this.getLayout();
    this.centerCardSprite.destroy();
    if (state.topCard) {
      // Build a lightweight card-like object for the display helper
      const cardLike = {
        suit: state.topCard.suit as Suit,
        rank: state.topCard.rank,
        displayValue: state.topCard.displayValue,
        displaySuit: state.topCard.displaySuit,
      };
      this.centerCardSprite = this.createCardDisplayFromData(
        L.centerCard.x,
        L.centerCard.y,
        cardLike
      );
    } else {
      this.centerCardSprite = this.createCardDisplay(
        L.centerCard.x,
        L.centerCard.y,
        null
      );
    }

    // Deck visibility
    this.player1DeckSprite.setVisible(state.player1Count > 0);
    this.player2DeckSprite.setVisible(state.player2Count > 0);

    // Show slap feedback based on lastAction
    if (state.lastAction) {
      const actionPlayer = state.lastAction.player as Player;
      if (state.lastAction.type === 'slap_attempt') {
        // We can infer success from the status message
        const success = state.statusMessage.includes('successfully') ||
                       state.statusMessage.includes('during challenge') ||
                       state.statusMessage.includes('collect');
        this.showSlapFeedback(actionPlayer, success);
      }
    }
  }

  /** Create a card display from raw server data (no Card instance needed) */
  private createCardDisplayFromData(
    x: number,
    y: number,
    data: { suit: string; rank: string; displayValue: string; displaySuit: string }
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const cardBg = this.add.rectangle(0, 0, CARD_WIDTH * CARD_SCALE, CARD_HEIGHT * CARD_SCALE, 0xffffff);
    cardBg.setStrokeStyle(2, 0x000000);

    const suitColor = (data.suit === 'HEARTS' || data.suit === 'DIAMONDS') ? 0xff0000 : 0x000000;

    const rankText = this.add.text(0, -15, data.displayValue, {
      fontSize: '16px',
      color: `#${suitColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const suitText = this.add.text(0, 5, data.displaySuit, {
      fontSize: '20px',
      color: `#${suitColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([cardBg, rankText, suitText]);
    return container;
  }

  private showDisconnectOverlay(message: string): void {
    if (this.disconnectOverlay) return; // already showing

    const portrait = isPortrait();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = portrait ? 380 : 500;
    const panelH = portrait ? 180 : 200;

    this.disconnectOverlay = this.add.container(0, 0);
    this.disconnectOverlay.setDepth(2000);

    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a1a);
    panel.setStrokeStyle(3, 0xff4444);

    const msgText = this.add.text(cx, cy - 30, message, {
      fontSize: portrait ? '20px' : '24px',
      color: COLORS.WHITE,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 40 }
    }).setOrigin(0.5);

    const hintMsg = this.isMobile ? 'Tap LEAVE to return to menu' : 'Press ESC to return to menu';
    const hint = this.add.text(cx, cy + 30, hintMsg, {
      fontSize: portrait ? '15px' : '18px',
      color: COLORS.LIGHT_GRAY
    }).setOrigin(0.5);

    this.disconnectOverlay.add([overlay, panel, msgText, hint]);

    // Add a touch-friendly button on mobile
    if (this.isMobile) {
      const btn = this.add.container(cx, cy + 70);
      const btnBg = this.add.rectangle(0, 0, 160, 45, 0x8B4513);
      btnBg.setStrokeStyle(2, 0xff4444);
      const btnText = this.add.text(0, 0, 'LEAVE', { fontSize: '18px', color: COLORS.WHITE, fontStyle: 'bold' }).setOrigin(0.5);
      btn.add([btnBg, btnText]);
      btn.setSize(160, 45);
      btn.setInteractive();
      btn.setDepth(2001);
      btn.on('pointerup', () => this.returnToMenu());
      this.disconnectOverlay.add(btn);
    }
  }

  // ================================================================
  // Local-mode methods (unchanged)
  // ================================================================

  private createCardDisplay(x: number, y: number, card: Card | null): Phaser.GameObjects.Image | Phaser.GameObjects.Container {
    if (!card) {
      // Empty placeholder
      const rect = this.add.rectangle(x, y, CARD_WIDTH * CARD_SCALE, CARD_HEIGHT * CARD_SCALE, 0x333333, 0.3);
      rect.setStrokeStyle(2, 0x666666);
      return rect as any;
    }

    // Check if we have card textures loaded
    const textureName = `card-${card.suit.toLowerCase()}-${card.rank.toLowerCase()}`;

    if (this.textures.exists(textureName)) {
      // Use actual card image
      const cardSprite = this.add.image(x, y, textureName);
      cardSprite.setScale(CARD_SCALE);
      return cardSprite;
    } else {
      // Fallback: Create simple card representation
      const container = this.add.container(x, y);

      const cardBg = this.add.rectangle(0, 0, CARD_WIDTH * CARD_SCALE, CARD_HEIGHT * CARD_SCALE, 0xffffff);
      cardBg.setStrokeStyle(2, 0x000000);

      const suitColor = (card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS) ?
        0xff0000 : 0x000000;

      const rankText = this.add.text(0, -15, card.displayValue, {
        fontSize: '16px',
        color: `#${suitColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const suitText = this.add.text(0, 5, card.displaySuit, {
        fontSize: '20px',
        color: `#${suitColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      container.add([cardBg, rankText, suitText]);
      return container;
    }
  }

  private playCard(player: Player): void {
    if (this.isMultiplayer) return; // handled separately
    if (this.game_logic.playCard(player)) {
      // Show animation first
      this.showPlayCardAnimation(player);

      // Update display (counts and other UI immediately, center card after animation)
      this.updateDisplayWithoutCenterCard();
    }
  }

  private attemptSlap(player: Player): void {
    if (this.isMultiplayer) return; // handled separately
    const success = this.game_logic.attemptSlap(player);
    this.updateDisplay();
    this.showSlapFeedback(player, success);
  }

  private updateDisplayWithoutCenterCard(): void {
    // Update card counts
    this.player1CountText.setText(`Cards: ${this.game_logic.player1Count}`);
    this.player2CountText.setText(`Cards: ${this.game_logic.player2Count}`);
    this.centerCountText.setText(`Center: ${this.game_logic.centerCount}`);

    // Update bonus pile
    const bonusCount = this.game_logic.bonusCount;
    this.bonusCountText.setText(`Bonus: ${bonusCount}`);
    this.bonusPileSprite.setVisible(bonusCount > 0);

    // Update status
    this.updateStatusText();

    // Update pile collection indicator
    if (this.game_logic.pileAwaitingCollection && this.game_logic.pileWinner) {
      this.pileCollectionText.setText(`Player ${this.game_logic.pileWinner}: SLAP TO COLLECT!`);
      this.pileCollectionText.setVisible(true);

      // Add pulsing animation
      this.tweens.add({
        targets: this.pileCollectionText,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.pileCollectionText.setVisible(false);
      this.tweens.killTweensOf(this.pileCollectionText);
      this.pileCollectionText.setScale(1);
    }

    // Update turn indicator
    if (this.game_logic.gameState === GameState.PLAYING) {
      this.turnIndicator.setText(`Player ${this.game_logic.currentPlayer}'s Turn`);
      this.challengeText.setText('');
    } else if (this.game_logic.gameState === GameState.CHALLENGE) {
      this.turnIndicator.setText(`Challenge Mode`);
      this.challengeText.setText(`Player ${this.game_logic.challengePlayer} has ${this.game_logic.challengeRemaining} chances`);
    } else if (this.game_logic.gameState === GameState.GAME_OVER) {
      this.turnIndicator.setText(`GAME OVER!`);
      this.challengeText.setText(`Player ${this.game_logic.winner} Wins!`);
      this.showWinScreen();
    }

    // Update deck visibility
    this.player1DeckSprite.setVisible(this.game_logic.player1Count > 0);
    this.player2DeckSprite.setVisible(this.game_logic.player2Count > 0);
  }

  private updateDisplay(): void {
    // Update all the non-center card elements first
    this.updateDisplayWithoutCenterCard();

    // Update center card using layout-aware position
    const L = this.getLayout();
    this.centerCardSprite.destroy();
    this.centerCardSprite = this.createCardDisplay(
      L.centerCard.x,
      L.centerCard.y,
      this.game_logic.topCard
    );
  }

  private showPlayCardAnimation(player: Player): void {
    const L = this.getLayout();

    const startX = player === 1 ? L.player1Deck.x : L.player2Deck.x;
    const startY = player === 1 ? L.player1Deck.y : L.player2Deck.y;
    const endX = L.centerCard.x;
    const endY = L.centerCard.y;

    const card = this.game_logic.topCard;
    if (!card) return;

    const animCard = this.createCardDisplay(startX, startY, card) as any;

    this.tweens.add({
      targets: animCard,
      x: endX,
      y: endY,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        animCard.destroy();
        // Update center card after animation completes
        this.centerCardSprite.destroy();
        this.centerCardSprite = this.createCardDisplay(endX, endY, card);
      }
    });
  }

  private showSlapFeedback(player: Player, success: boolean): void {
    const feedbackText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      success ? 'GOOD SLAP!' : 'BAD SLAP!',
      {
        fontSize: '36px',
        color: success ? COLORS.GREEN : COLORS.RED,
        fontStyle: 'bold',
        stroke: COLORS.BLACK,
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    // Store original position for shake effect
    const originalX = feedbackText.x;
    const originalY = feedbackText.y;

    // TEXT-ONLY SHAKE: Smooth oscillating shake just for the text
    const shakeIntensity = success ? 2 : 4;
    const shakeDuration = success ? 300 : 500;

    this.tweens.add({
      targets: feedbackText,
      x: originalX + shakeIntensity,
      duration: shakeDuration / 12,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 11
    });

    // Pop-in effect (scale animation)
    feedbackText.setScale(0);
    this.tweens.add({
      targets: feedbackText,
      scale: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: feedbackText,
          scale: 1,
          y: feedbackText.y - 30,
          duration: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this.tweens.killTweensOf(feedbackText);
            this.tweens.add({
              targets: feedbackText,
              alpha: 0,
              duration: 1200,
              delay: 200,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                feedbackText.destroy();
              }
            });
          }
        });
      }
    });
  }

  // ---- Win screen (local mode) ----

  private showWinScreen(): void {
    const winContainer = this.add.container(0, 0);
    const portrait = isPortrait();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = portrait ? 460 : 600;
    const panelH = portrait ? 340 : 400;

    if (this.centerCardSprite) {
      this.centerCardSprite.setVisible(false);
    }

    winContainer.setDepth(1000);

    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);

    const panelBg = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a1a);
    panelBg.setStrokeStyle(4, 0xffd700);

    const crown = this.add.text(cx, cy - (portrait ? 100 : 120), '👑', { fontSize: portrait ? '48px' : '64px' }).setOrigin(0.5);

    const winText = this.add.text(cx, cy - (portrait ? 40 : 50), `PLAYER ${this.game_logic.winner} WINS!`, {
      fontSize: portrait ? '36px' : '48px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    const reasonText = this.add.text(cx, cy - (portrait ? 5 : 10), 'Opponent ran out of cards!', {
      fontSize: portrait ? '16px' : '20px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const scoresText = this.add.text(cx, cy + (portrait ? 25 : 30),
      `Final Scores - P1: ${this.game_logic.player1Count} | P2: ${this.game_logic.player2Count}`, {
      fontSize: portrait ? '15px' : '18px',
      color: COLORS.LIGHT_GRAY
    }).setOrigin(0.5);

    winContainer.add([overlay, panelBg, crown, winText, reasonText, scoresText]);

    if (this.isMobile) {
      const btnY = cy + (portrait ? 80 : 90);
      const playAgainBtn = this.createWinScreenButton(cx - 110, btnY, 'PLAY AGAIN', 0x2a5a2a, COLORS.GREEN);
      playAgainBtn.on('pointerup', () => { winContainer.destroy(); this.scene.restart(); });

      const menuBtn = this.createWinScreenButton(cx + 110, btnY, 'MENU', 0x8B4513, COLORS.GOLD);
      menuBtn.on('pointerup', () => { winContainer.destroy(); this.returnToMenu(); });

      winContainer.add([playAgainBtn, menuBtn]);
    } else {
      const controlsText = this.add.text(cx, cy + 80, 'Press SPACE to play again or ESC for menu', {
        fontSize: '20px', color: COLORS.WHITE
      }).setOrigin(0.5);
      winContainer.add(controlsText);

      this.tweens.add({ targets: controlsText, alpha: 0.5, duration: 1000, yoyo: true, repeat: -1, delay: 1000 });

      const spaceHandler = () => {
        this.input.keyboard?.off('keydown-SPACE', spaceHandler);
        this.input.keyboard?.off('keydown-ESC', escHandler);
        this.scene.restart();
      };
      const escHandler = () => {
        this.input.keyboard?.off('keydown-SPACE', spaceHandler);
        this.input.keyboard?.off('keydown-ESC', escHandler);
        this.returnToMenu();
      };
      this.input.keyboard?.once('keydown-SPACE', spaceHandler);
      this.input.keyboard?.once('keydown-ESC', escHandler);
    }

    winContainer.setAlpha(0);
    crown.setScale(0);
    winText.setScale(0);

    this.tweens.add({ targets: winContainer, alpha: 1, duration: 500, ease: 'Power2' });
    this.tweens.add({ targets: crown, scale: 1, duration: 400, delay: 300, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: winText, scale: 1, duration: 400, delay: 500, ease: 'Back.easeOut' });
  }

  // ---- Win screen (multiplayer mode) ----

  private showWinScreenMultiplayer(state: ServerGameState): void {
    const winContainer = this.add.container(0, 0);
    const portrait = isPortrait();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const panelW = portrait ? 460 : 600;
    const panelH = portrait ? 360 : 400;

    if (this.centerCardSprite) {
      this.centerCardSprite.setVisible(false);
    }

    winContainer.setDepth(1000);

    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.8);

    const panelBg = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a1a);
    panelBg.setStrokeStyle(4, 0xffd700);

    const iWon = state.winner === this.myPlayerNumber;

    const crown = this.add.text(cx, cy - (portrait ? 105 : 120), iWon ? '👑' : '💀', {
      fontSize: portrait ? '48px' : '64px'
    }).setOrigin(0.5);

    const winText = this.add.text(cx, cy - (portrait ? 45 : 50), iWon ? 'YOU WIN!' : 'YOU LOSE!', {
      fontSize: portrait ? '36px' : '48px',
      color: iWon ? COLORS.GOLD : COLORS.RED,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    const opponentNum = this.myPlayerNumber === 1 ? 2 : 1;
    const opponentInfo = this.playerInfo[opponentNum];
    const myInfo = this.playerInfo[this.myPlayerNumber];

    const reasonText = this.add.text(cx, cy - (portrait ? 5 : 10),
      iWon ? `${opponentInfo?.username || 'Opponent'} ran out of cards!` : 'You ran out of cards!', {
      fontSize: portrait ? '16px' : '20px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);

    let recordLine = `Final Scores - P1: ${state.player1Count} | P2: ${state.player2Count}`;
    if (myInfo?.wins != null) {
      recordLine += `\nYour total wins: ${myInfo.wins}`;
    }

    const scoresText = this.add.text(cx, cy + (portrait ? 25 : 30), recordLine, {
      fontSize: portrait ? '15px' : '18px',
      color: COLORS.LIGHT_GRAY,
      align: 'center'
    }).setOrigin(0.5);

    winContainer.add([overlay, panelBg, crown, winText, reasonText, scoresText]);

    if (this.isMobile) {
      const btnY = cy + (portrait ? 85 : 100);
      const rematchBtn = this.createWinScreenButton(cx - 110, btnY, 'REMATCH', 0x2a5a2a, COLORS.GREEN);
      rematchBtn.on('pointerup', () => {
        if (this.socket) this.socket.emit('restartGame', { roomCode: this.roomCode });
        winContainer.destroy();
      });

      const menuBtn = this.createWinScreenButton(cx + 110, btnY, 'MENU', 0x8B4513, COLORS.GOLD);
      menuBtn.on('pointerup', () => { winContainer.destroy(); this.returnToMenu(); });

      winContainer.add([rematchBtn, menuBtn]);
    } else {
      const controlsText = this.add.text(cx, cy + 90, 'Press SPACE for rematch or ESC for menu', {
        fontSize: '20px', color: COLORS.WHITE
      }).setOrigin(0.5);
      winContainer.add(controlsText);

      this.tweens.add({ targets: controlsText, alpha: 0.5, duration: 1000, yoyo: true, repeat: -1, delay: 1000 });

      const spaceHandler = () => {
        this.input.keyboard?.off('keydown-SPACE', spaceHandler);
        this.input.keyboard?.off('keydown-ESC', escHandler);
        if (this.socket) this.socket.emit('restartGame', { roomCode: this.roomCode });
        winContainer.destroy();
      };
      const escHandler = () => {
        this.input.keyboard?.off('keydown-SPACE', spaceHandler);
        this.input.keyboard?.off('keydown-ESC', escHandler);
        this.returnToMenu();
      };
      this.input.keyboard?.once('keydown-SPACE', spaceHandler);
      this.input.keyboard?.once('keydown-ESC', escHandler);
    }

    winContainer.setAlpha(0);
    crown.setScale(0);
    winText.setScale(0);

    this.tweens.add({ targets: winContainer, alpha: 1, duration: 500, ease: 'Power2' });
    this.tweens.add({ targets: crown, scale: 1, duration: 400, delay: 300, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: winText, scale: 1, duration: 400, delay: 500, ease: 'Back.easeOut' });
  }

  // ---- Win screen button helper ----

  private createWinScreenButton(
    x: number, y: number, label: string,
    bgColor: number, textColor: string
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 200, 55, bgColor);
    bg.setStrokeStyle(3, 0xffd700);
    const text = this.add.text(0, 0, label, {
      fontSize: '22px',
      color: textColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.add([bg, text]);
    btn.setSize(200, 55);
    btn.setInteractive();
    btn.setDepth(1001);

    btn.on('pointerdown', () => btn.setScale(0.95));
    btn.on('pointerout', () => btn.setScale(1));
    return btn;
  }

  // ---- Navigation ----

  private returnToMenu(): void {
    // Disconnect socket when leaving
    if (this.isMultiplayer && this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  // ---- Shared helpers ----

  private toggleMode(): void {
    this.isEasyMode = !this.isEasyMode;
    this.modeToggleText.setText(
      this.isEasyMode ? 'EASY MODE\n(Press M to toggle)' : 'HARD MODE\n(Press M to toggle)'
    );
    this.modeToggleText.setColor(this.isEasyMode ? COLORS.GREEN : COLORS.RED);

    // Update status text immediately when mode changes
    if (!this.isMultiplayer) {
      this.updateStatusText();
    } else if (this.lastServerState) {
      // Re-apply server state with new mode
      if (this.isEasyMode) {
        this.statusText.setText(this.lastServerState.statusMessage);
      }
    }
  }

  private updateStatusText(): void {
    const gameMessage = this.game_logic.getGameStatusMessage();

    if (this.isEasyMode) {
      this.statusText.setText(gameMessage);
    } else {
      if (!this.isRuleHintMessage(gameMessage)) {
        this.statusText.setText(gameMessage);
      }
    }
  }

  private isRuleHintMessage(message: string): boolean {
    const ruleHintKeywords = [
      'doubles', 'sandwich', 'tens', 'marriage',
      'top-bottom', '4-in-row', 'sequence', 'jokers',
      'slappable', 'Double', 'Sandwich', 'Marriage'
    ];

    return ruleHintKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  shutdown(): void {
    // Clean up socket listeners when scene shuts down
    if (this.socket) {
      this.socket.off('gameStateUpdate');
      this.socket.off('opponentDisconnected');
      this.socket.off('roomError');
      this.socket.off('gameStart');
      this.socket.off('winRecorded');
    }
  }
}
