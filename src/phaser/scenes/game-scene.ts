import * as Phaser from 'phaser';
import { SCENE_KEYS, ASSET_KEYS, COLORS, CARD_SCALE, CARD_WIDTH, CARD_HEIGHT, GameState, Player, Suit, GameRules, RULE_NAMES, AuthUser } from '../common';
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
  }

  create(): void {
    this.checkAssets();
    this.createBackground();
    this.initializeGame();
    this.createUI();
    this.createActiveRulesDisplay();
    this.setupInput();

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

  private createPlayingAreas(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffd700, 0.5);

    // Center pile area
    graphics.strokeRoundedRect(
      centerX - (CARD_WIDTH * CARD_SCALE) / 2 - 10,
      centerY - (CARD_HEIGHT * CARD_SCALE) / 2 - 10,
      CARD_WIDTH * CARD_SCALE + 20,
      CARD_HEIGHT * CARD_SCALE + 20,
      5
    );

    // Player 1 deck area (bottom)
    graphics.strokeRoundedRect(
      140,
      this.cameras.main.height - 200 - (CARD_HEIGHT * CARD_SCALE) / 2 - 10,
      CARD_WIDTH * CARD_SCALE + 20,
      CARD_HEIGHT * CARD_SCALE + 20,
      5
    );

    // Player 2 deck area (top)
    graphics.strokeRoundedRect(
      this.cameras.main.width - 200 - (CARD_WIDTH * CARD_SCALE) / 2 - 10,
      140,
      CARD_WIDTH * CARD_SCALE + 20,
      CARD_HEIGHT * CARD_SCALE + 20,
      5
    );

    // Bonus pile area (right side)
    graphics.strokeRoundedRect(
      this.cameras.main.width - 400 - 10,
      centerY - (CARD_HEIGHT * CARD_SCALE) / 2 - 10,
      CARD_WIDTH * CARD_SCALE + 20,
      CARD_HEIGHT * CARD_SCALE + 20,
      5
    );
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
    // Container for active rules display in top-left
    this.activeRulesContainer = this.add.container(75,75);

    // Get active rules from game logic
    const activeRuleNames = this.game_logic.getActiveRuleNames();
    const rulesText = activeRuleNames.length > 0
      ? activeRuleNames.join('\n')
      : 'No rules active';

    // Dynamic sizing based on number of rules
    const titleHeight = 25;
    const lineHeight = 18;
    const padding = 20;
    const minWidth = 200;

    // Calculate dimensions
    const numLines = activeRuleNames.length || 1;
    const textHeight = numLines * lineHeight;
    const panelHeight = titleHeight + textHeight + padding;

    // Calculate width based on longest rule name
    const longestRule = activeRuleNames.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
      'ACTIVE RULES'
    );
    const estimatedWidth = Math.max(minWidth, longestRule.length * 8 + 40);
    const panelWidth = Math.min(estimatedWidth, 300);

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
      15,
      'ACTIVE RULES',
      {
        fontSize: '16px',
        color: COLORS.GOLD,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    // Rules display
    const rulesDisplay = this.add.text(
      panelWidth / 2,
      titleHeight + 10,
      rulesText,
      {
        fontSize: '14px',
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
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Create card sprites
    this.centerCardSprite = this.createCardDisplay(centerX, centerY, null);
    this.player1DeckSprite = this.createCardDisplay(178, this.cameras.main.height - 200, null) as any;
    this.player2DeckSprite = this.createCardDisplay(this.cameras.main.width - 200, 188, null) as any;

    // Bonus pile (initially hidden)
    this.bonusPileSprite = this.add.rectangle(
      this.cameras.main.width - 372,
      centerY,
      CARD_WIDTH * CARD_SCALE,
      CARD_HEIGHT * CARD_SCALE,
      0x4169E1
    );
    this.bonusPileSprite.setStrokeStyle(2, 0x000080);
    this.bonusPileSprite.setVisible(false);

    // Card count displays
    this.player1CountText = this.add.text(180, this.cameras.main.height - 125, 'Cards: 26', {
      fontSize: '18px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.player2CountText = this.add.text(this.cameras.main.width - 200, 115, 'Cards: 26', {
      fontSize: '18px',
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

      this.player1NameText = this.add.text(180, this.cameras.main.height - 155, p1Label, {
        fontSize: '14px',
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.player2NameText = this.add.text(this.cameras.main.width - 200, 85, p2Label, {
        fontSize: '14px',
        color: COLORS.GOLD,
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    this.centerCountText = this.add.text(centerX, centerY + 80, 'Center: 0', {
      fontSize: '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.bonusCountText = this.add.text(this.cameras.main.width - 375, centerY + 80, 'Bonus: 0', {
      fontSize: '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Status and instructions
    this.statusText = this.add.text(centerX, this.cameras.main.height - 100, 'Game ready', {
      fontSize: '16px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.turnIndicator = this.add.text(centerX, 100, "Player 1's Turn", {
      fontSize: '24px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.challengeText = this.add.text(centerX, 130, '', {
      fontSize: '16px',
      color: COLORS.RED,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pile collection indicator (initially hidden)
    this.pileCollectionText = this.add.text(centerX, centerY - 100, '', {
      fontSize: '20px',
      color: COLORS.GREEN,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);
    this.pileCollectionText.setVisible(false);

    // Control instructions — change text based on multiplayer
    const controlHint = this.isMultiplayer
      ? `You are Player ${this.myPlayerNumber} | Q=Play, A=Slap | Room: ${this.roomCode} | ESC=Leave`
      : 'Player 1: Q=Play, A=Slap | Player 2: P=Play, L=Slap | ESC=Menu';

    this.add.text(centerX, this.cameras.main.height - 30, controlHint, {
      fontSize: '14px',
      color: COLORS.LIGHT_GRAY
    }).setOrigin(0.5);

    // Mode toggle (top-right corner)
    this.modeToggleText = this.add.text(
      this.cameras.main.width - 20,
      20,
      this.isEasyMode ? 'EASY MODE\n(Press M to toggle)' : 'HARD MODE\n(Press M to toggle)',
      {
        fontSize: '14px',
        color: this.isEasyMode ? COLORS.GREEN : COLORS.RED,
        fontStyle: 'bold',
        align: 'right',
        lineSpacing: 2
      }
    ).setOrigin(1.25, -24.2);
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
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        cardLike
      );
    } else {
      this.centerCardSprite = this.createCardDisplay(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
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

    this.disconnectOverlay = this.add.container(0, 0);
    this.disconnectOverlay.setDepth(2000);

    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );

    const panel = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      500,
      200,
      0x1a1a1a
    );
    panel.setStrokeStyle(3, 0xff4444);

    const msgText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 30,
      message,
      { fontSize: '24px', color: COLORS.WHITE, fontStyle: 'bold', align: 'center' }
    ).setOrigin(0.5);

    const hint = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 30,
      'Press ESC to return to menu',
      { fontSize: '18px', color: COLORS.LIGHT_GRAY }
    ).setOrigin(0.5);

    this.disconnectOverlay.add([overlay, panel, msgText, hint]);
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

    // Update center card
    this.centerCardSprite.destroy();
    this.centerCardSprite = this.createCardDisplay(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.game_logic.topCard
    );
  }

  private showPlayCardAnimation(player: Player): void {
    const player1X = 180;
    const player2X = this.cameras.main.width - 180;

    const startX = player === 1 ? player1X : player2X;
    const startY = player === 1 ? this.cameras.main.height - 150 : 150;
    const endX = this.cameras.main.centerX;
    const endY = this.cameras.main.centerY;

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

    if (this.centerCardSprite) {
      this.centerCardSprite.setVisible(false);
    }

    winContainer.setDepth(1000);

    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );

    const panelBg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      600,
      400,
      0x1a1a1a
    );
    panelBg.setStrokeStyle(4, 0xffd700);

    const crown = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 120,
      '👑',
      { fontSize: '64px' }
    ).setOrigin(0.5);

    const winText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      `PLAYER ${this.game_logic.winner} WINS!`,
      {
        fontSize: '48px',
        color: COLORS.GOLD,
        fontStyle: 'bold',
        stroke: COLORS.BLACK,
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    const reasonText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 10,
      'Opponent ran out of cards!',
      {
        fontSize: '20px',
        color: COLORS.WHITE,
        fontStyle: 'italic'
      }
    ).setOrigin(0.5);

    const scoresText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 30,
      `Final Scores - P1: ${this.game_logic.player1Count} | P2: ${this.game_logic.player2Count}`,
      {
        fontSize: '18px',
        color: COLORS.LIGHT_GRAY
      }
    ).setOrigin(0.5);

    const controlsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 80,
      'Press SPACE to play again or ESC for menu',
      {
        fontSize: '20px',
        color: COLORS.WHITE
      }
    ).setOrigin(0.5);

    winContainer.add([overlay, panelBg, crown, winText, reasonText, scoresText, controlsText]);

    winContainer.setAlpha(0);
    crown.setScale(0);
    winText.setScale(0);

    this.tweens.add({ targets: winContainer, alpha: 1, duration: 500, ease: 'Power2' });
    this.tweens.add({ targets: crown, scale: 1, duration: 400, delay: 300, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: winText, scale: 1, duration: 400, delay: 500, ease: 'Back.easeOut' });
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

  // ---- Win screen (multiplayer mode) ----

  private showWinScreenMultiplayer(state: ServerGameState): void {
    const winContainer = this.add.container(0, 0);

    if (this.centerCardSprite) {
      this.centerCardSprite.setVisible(false);
    }

    winContainer.setDepth(1000);

    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );

    const panelBg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      600,
      400,
      0x1a1a1a
    );
    panelBg.setStrokeStyle(4, 0xffd700);

    const iWon = state.winner === this.myPlayerNumber;

    const crown = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 120,
      iWon ? '👑' : '💀',
      { fontSize: '64px' }
    ).setOrigin(0.5);

    const winText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      iWon ? 'YOU WIN!' : 'YOU LOSE!',
      {
        fontSize: '48px',
        color: iWon ? COLORS.GOLD : COLORS.RED,
        fontStyle: 'bold',
        stroke: COLORS.BLACK,
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Show opponent name if available
    const opponentNum = this.myPlayerNumber === 1 ? 2 : 1;
    const opponentInfo = this.playerInfo[opponentNum];
    const myInfo = this.playerInfo[this.myPlayerNumber];

    const reasonText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 10,
      iWon
        ? `${opponentInfo?.username || 'Opponent'} ran out of cards!`
        : 'You ran out of cards!',
      {
        fontSize: '20px',
        color: COLORS.WHITE,
        fontStyle: 'italic'
      }
    ).setOrigin(0.5);

    // Show win record if authenticated
    let recordLine = `Final Scores - P1: ${state.player1Count} | P2: ${state.player2Count}`;
    if (myInfo?.wins != null) {
      recordLine += `\nYour total wins: ${myInfo.wins}`;
    }

    const scoresText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 30,
      recordLine,
      {
        fontSize: '18px',
        color: COLORS.LIGHT_GRAY,
        align: 'center'
      }
    ).setOrigin(0.5);

    const controlsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 90,
      'Press SPACE for rematch or ESC for menu',
      {
        fontSize: '20px',
        color: COLORS.WHITE
      }
    ).setOrigin(0.5);

    winContainer.add([overlay, panelBg, crown, winText, reasonText, scoresText, controlsText]);

    winContainer.setAlpha(0);
    crown.setScale(0);
    winText.setScale(0);

    this.tweens.add({ targets: winContainer, alpha: 1, duration: 500, ease: 'Power2' });
    this.tweens.add({ targets: crown, scale: 1, duration: 400, delay: 300, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: winText, scale: 1, duration: 400, delay: 500, ease: 'Back.easeOut' });
    this.tweens.add({ targets: controlsText, alpha: 0.5, duration: 1000, yoyo: true, repeat: -1, delay: 1000 });

    const spaceHandler = () => {
      this.input.keyboard?.off('keydown-SPACE', spaceHandler);
      this.input.keyboard?.off('keydown-ESC', escHandler);
      // Request restart from server
      if (this.socket) {
        this.socket.emit('restartGame', { roomCode: this.roomCode });
      }
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
