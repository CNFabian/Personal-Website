import * as Phaser from 'phaser';
import {
  COLORS,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_SCALE,
  ASSET_KEYS,
  Suit,
  Rank,
  RANK_VALUES,
  SUIT_DISPLAY,
  RANK_DISPLAY,
  isMobileDevice,
} from '../common';
import { Card } from '../lib/card';
import {
  GinRummy,
  GinRummyState,
  findBestMelds,
  getDeadwoodValue,
  Meld,
  RoundResult,
} from '../lib/gin-rummy';

const GIN_RUMMY_GAME_SCENE_KEY = 'GinRummyGameScene';

// Layout constants
const HAND_CARD_SPACING = 52;
const HAND_CARD_SPACING_MOBILE = 38;
const CARD_DISPLAY_SCALE = 0.45;
const CARD_DISPLAY_SCALE_MOBILE = 0.35;

interface CardSprite extends Phaser.GameObjects.Container {
  cardData?: Card;
  cardIndex?: number;
  originalX?: number;
  originalY?: number;
}

export class GinRummyGameScene extends Phaser.Scene {
  private gameLogic!: GinRummy;
  private isMobile: boolean = false;

  // Card sprite containers
  private playerHandSprites: CardSprite[] = [];
  private opponentHandSprites: Phaser.GameObjects.Container[] = [];
  private stockPileSprite!: Phaser.GameObjects.Container;
  private discardPileSprite!: Phaser.GameObjects.Container;

  // UI elements
  private statusText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private deadwoodText!: Phaser.GameObjects.Text;
  private stockCountText!: Phaser.GameObjects.Text;
  private discardLabel!: Phaser.GameObjects.Text;

  // Buttons
  private knockButton!: Phaser.GameObjects.Container;
  private newRoundButton!: Phaser.GameObjects.Container;
  private newGameButton!: Phaser.GameObjects.Container;

  // Drag state
  private draggedSprite: CardSprite | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private isDragging: boolean = false;
  private dragThreshold: number = 8; // pixels before we consider it a drag vs tap

  // State tracking
  private isAnimating: boolean = false;
  private usingSprites: boolean = false;

  // Drop zone references (for checking where cards are dropped)
  private centerZoneY: number = 0;
  private handY: number = 0;
  private stockPileX: number = 0;
  private discardPileX: number = 0;

  // Round result display
  private roundResultContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: GIN_RUMMY_GAME_SCENE_KEY });
  }

  create(): void {
    this.isMobile = isMobileDevice();
    this.gameLogic = new GinRummy(100);
    this.usingSprites = this.textures.exists(ASSET_KEYS.CARDS);

    const h = +this.game.config.height;
    this.centerZoneY = this.isMobile ? h / 2 - 10 : h / 2;
    this.handY = h - (this.isMobile ? 125 : 150);

    this.createBackground();
    this.createUI();
    this.startNewRound();
  }

  private createBackground(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a5f38, 1);
    bg.fillRect(0, 0, w, h);

    bg.lineStyle(4, 0x8B4513, 1);
    bg.strokeRect(10, 10, w - 20, h - 20);

    bg.lineStyle(1, 0x0b6b40, 0.3);
    for (let i = 0; i < w; i += 40) {
      bg.lineBetween(i, 0, i, h);
    }
    for (let i = 0; i < h; i += 40) {
      bg.lineBetween(0, i, w, i);
    }

    this.add.text(w / 2, this.isMobile ? 20 : 25, 'GIN RUMMY', {
      fontSize: this.isMobile ? '20px' : '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5, 0).setDepth(10);
  }

  private createUI(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;

    // Score display (top-left)
    this.scoreText = this.add.text(20, this.isMobile ? 15 : 20, '', {
      fontSize: this.isMobile ? '13px' : '16px',
      color: COLORS.WHITE,
      fontStyle: 'bold',
    }).setDepth(10);

    // Round display (top-right)
    this.roundText = this.add.text(w - 20, this.isMobile ? 15 : 20, '', {
      fontSize: this.isMobile ? '13px' : '16px',
      color: COLORS.WHITE,
    }).setOrigin(1, 0).setDepth(10);

    // Status message (between piles and hand)
    this.statusText = this.add.text(w / 2, this.centerZoneY + 65, '', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(50);

    // Deadwood counter (near player hand)
    this.deadwoodText = this.add.text(w / 2, this.handY - 30, '', {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#AAFFAA',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Stock count text
    this.stockCountText = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: COLORS.WHITE,
    }).setOrigin(0.5).setDepth(10);

    // Discard label
    this.discardLabel = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: COLORS.WHITE,
    }).setOrigin(0.5).setDepth(10);

    this.createButtons();
  }

  private createButtons(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;

    // Knock button - shown near the hand when eligible
    this.knockButton = this.createButton(
      w / 2,
      this.handY - (this.isMobile ? 55 : 65),
      'KNOCK',
      0xE74C3C,
      () => this.onKnock()
    );
    this.knockButton.setVisible(false);

    // New Round button
    this.newRoundButton = this.createButton(
      w / 2 - 80,
      this.centerZoneY + 120,
      'Next\nRound',
      0x27AE60,
      () => this.onNewRound()
    );
    this.newRoundButton.setVisible(false);

    // New Game button
    this.newGameButton = this.createButton(
      w / 2 + 80,
      this.centerZoneY + 120,
      'New\nGame',
      0xE74C3C,
      () => this.onNewGame()
    );
    this.newGameButton.setVisible(false);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(60);
    const bw = this.isMobile ? 70 : 80;
    const bh = this.isMobile ? 36 : 40;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0xFFFFFF, 0.5);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const text = this.add.text(0, 0, label, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => container.setScale(1.05));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => {
      if (!this.isAnimating) callback();
    });

    return container;
  }

  // --- Game Actions ---

  private startNewRound(): void {
    this.gameLogic.startNewRound();
    this.draggedSprite = null;
    this.isDragging = false;
    this.clearRoundResult();
    this.renderAll();
  }

  private onDrawStock(): void {
    if (this.isAnimating) return;
    if (this.gameLogic.state !== GinRummyState.PLAYER_TURN_DRAW) return;

    this.gameLogic.drawFromStock();
    this.renderAll();
  }

  private onDrawDiscard(): void {
    if (this.isAnimating) return;
    if (this.gameLogic.state !== GinRummyState.PLAYER_TURN_DRAW) return;
    if (!this.gameLogic.topDiscard) return;

    this.gameLogic.drawFromDiscard();
    this.renderAll();
  }

  private onKnock(): void {
    if (this.isAnimating) return;
    if (this.gameLogic.state !== GinRummyState.PLAYER_TURN_DISCARD) return;

    // Knock: find the best card to discard that results in lowest deadwood
    const hand = this.gameLogic.player1Hand;
    let bestIdx = 0;
    let bestDW = Infinity;
    for (let i = 0; i < hand.length; i++) {
      const t = [...hand];
      t.splice(i, 1);
      const r = findBestMelds(t);
      if (r.deadwoodValue < bestDW) {
        bestDW = r.deadwoodValue;
        bestIdx = i;
      }
    }

    if (bestDW <= 10) {
      const result = this.gameLogic.knockWithDiscard(bestIdx);
      if (result) {
        this.showRoundResult(result);
        this.renderAll();
      }
    }
  }

  private discardCard(cardIndex: number): void {
    if (this.gameLogic.state !== GinRummyState.PLAYER_TURN_DISCARD) return;

    this.gameLogic.discard(cardIndex);
    this.afterPlayerDiscard();
  }

  private afterPlayerDiscard(): void {
    this.renderAll();

    if (
      this.gameLogic.state === GinRummyState.ROUND_OVER ||
      this.gameLogic.state === GinRummyState.GAME_OVER
    ) {
      if (this.gameLogic.roundResult) {
        this.showRoundResult(this.gameLogic.roundResult);
      }
      this.renderAll();
      return;
    }

    // AI's turn
    if (this.gameLogic.state === GinRummyState.OPPONENT_TURN_DRAW) {
      this.isAnimating = true;
      this.statusText.setText('AI is thinking...');
      this.time.delayedCall(800, () => this.doAiTurn());
    }
  }

  private doAiTurn(): void {
    this.gameLogic.aiDraw();
    this.renderAll();

    this.time.delayedCall(600, () => {
      const result = this.gameLogic.aiDiscard();
      this.isAnimating = false;

      if (result.action === 'knock' && result.result) {
        this.showRoundResult(result.result);
      }

      this.renderAll();

      if (
        this.gameLogic.state === GinRummyState.ROUND_OVER ||
        this.gameLogic.state === GinRummyState.GAME_OVER
      ) {
        if (this.gameLogic.roundResult) {
          this.showRoundResult(this.gameLogic.roundResult);
        }
      }
    });
  }

  private onNewRound(): void {
    this.startNewRound();
  }

  private onNewGame(): void {
    this.gameLogic.reset();
    this.startNewRound();
  }

  // --- Drag & Drop Logic ---

  private getHandSlotIndex(worldX: number): number {
    const w = +this.game.config.width;
    const hand = this.gameLogic.player1Hand;
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    const spacing = this.isMobile ? HAND_CARD_SPACING_MOBILE : HAND_CARD_SPACING;

    const totalWidth = (hand.length - 1) * spacing + CARD_WIDTH * scale;
    const startX = (w - totalWidth) / 2 + (CARD_WIDTH * scale) / 2;

    // Find closest slot
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < hand.length; i++) {
      const slotX = startX + i * spacing;
      const dist = Math.abs(worldX - slotX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }
    return closestIdx;
  }

  private isInDiscardZone(x: number, y: number): boolean {
    // The "middle" area where piles are — above the hand area
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    const cardH = CARD_HEIGHT * scale;
    return y < this.handY - cardH / 2 - 10 && y > (this.isMobile ? 50 : 60);
  }

  private setupCardDrag(sprite: CardSprite, index: number): void {
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    sprite.setSize(CARD_WIDTH * scale, CARD_HEIGHT * scale);
    sprite.setInteractive({ useHandCursor: true, draggable: false });

    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating) return;
      if (this.roundResultContainer) return;

      this.draggedSprite = sprite;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.isDragging = false;

      // Bring to front
      sprite.setDepth(100);
    });

    sprite.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggedSprite || this.draggedSprite !== sprite) return;

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.dragThreshold) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        sprite.x = sprite.originalX! + dx;
        sprite.y = sprite.originalY! + dy;
      }
    });

    sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggedSprite || this.draggedSprite !== sprite) return;
      const wasDragging = this.isDragging;
      const cardIdx = sprite.cardIndex!;

      this.draggedSprite = null;
      this.isDragging = false;

      if (wasDragging) {
        // Check where the card was dropped
        if (this.isInDiscardZone(pointer.x, pointer.y)) {
          // Drop in the middle = discard
          if (this.gameLogic.state === GinRummyState.PLAYER_TURN_DISCARD) {
            this.discardCard(cardIdx);
            return;
          }
        }

        // Reorder within hand — find the target slot
        const targetIdx = this.getHandSlotIndex(pointer.x);
        if (targetIdx !== cardIdx) {
          this.gameLogic.reorderHand(1, cardIdx, targetIdx);
        }

        // Snap back / re-render
        this.renderPlayerHand();
      }
      // If not dragging (was a tap), do nothing — taps are for piles
    });

    sprite.on('pointerupoutside', () => {
      if (this.draggedSprite === sprite) {
        this.draggedSprite = null;
        this.isDragging = false;
        // Snap back
        sprite.x = sprite.originalX!;
        sprite.y = sprite.originalY!;
        sprite.setDepth(20 + (sprite.cardIndex || 0));
      }
    });
  }

  // --- Rendering ---

  private renderAll(): void {
    this.renderScores();
    this.renderPiles();
    this.renderPlayerHand();
    this.renderOpponentHand();
    this.renderButtons();
    this.renderDeadwood();
    this.updateStatus();
  }

  private renderScores(): void {
    this.scoreText.setText(
      `You: ${this.gameLogic.player1Score}  |  AI: ${this.gameLogic.player2Score}`
    );
    this.roundText.setText(`Round ${this.gameLogic.roundNumber} | Target: ${this.gameLogic.targetScore}`);
  }

  private renderPiles(): void {
    const w = +this.game.config.width;
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    const centerY = this.centerZoneY;

    // Destroy existing pile sprites
    if (this.stockPileSprite) this.stockPileSprite.destroy();
    if (this.discardPileSprite) this.discardPileSprite.destroy();

    // Stock pile (left of center)
    this.stockPileX = w / 2 - (this.isMobile ? 40 : 50);
    this.stockPileSprite = this.createCardBack(this.stockPileX, centerY, scale);
    this.stockPileSprite.setDepth(5);

    // Make stock pile tappable
    this.stockPileSprite.setSize(CARD_WIDTH * scale, CARD_HEIGHT * scale);
    this.stockPileSprite.setInteractive({ useHandCursor: true });
    this.stockPileSprite.on('pointerdown', () => this.onDrawStock());

    // Stock count label
    this.stockCountText.setPosition(this.stockPileX, centerY + (this.isMobile ? 50 : 55));
    this.stockCountText.setText(`Stock: ${this.gameLogic.stockCount}`);

    // Discard pile (right of center)
    this.discardPileX = w / 2 + (this.isMobile ? 40 : 50);
    const topDiscard = this.gameLogic.topDiscard;
    if (topDiscard) {
      this.discardPileSprite = this.createCardFace(topDiscard, this.discardPileX, centerY, scale);
    } else {
      this.discardPileSprite = this.add.container(this.discardPileX, centerY);
      const ph = this.add.graphics();
      ph.lineStyle(2, 0xFFFFFF, 0.3);
      ph.strokeRoundedRect(
        -CARD_WIDTH * scale / 2,
        -CARD_HEIGHT * scale / 2,
        CARD_WIDTH * scale,
        CARD_HEIGHT * scale,
        6
      );
      this.discardPileSprite.add(ph);
    }
    this.discardPileSprite.setDepth(5);

    // Make discard pile tappable
    this.discardPileSprite.setSize(CARD_WIDTH * scale, CARD_HEIGHT * scale);
    this.discardPileSprite.setInteractive({ useHandCursor: true });
    this.discardPileSprite.on('pointerdown', () => this.onDrawDiscard());

    // Discard label
    this.discardLabel.setPosition(this.discardPileX, centerY + (this.isMobile ? 50 : 55));
    this.discardLabel.setText('Discard');
  }

  private renderPlayerHand(): void {
    // Destroy existing
    this.playerHandSprites.forEach((s) => s.destroy());
    this.playerHandSprites = [];

    const hand = this.gameLogic.player1Hand;
    const w = +this.game.config.width;
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    const spacing = this.isMobile ? HAND_CARD_SPACING_MOBILE : HAND_CARD_SPACING;

    const totalWidth = (hand.length - 1) * spacing + CARD_WIDTH * scale;
    const startX = (w - totalWidth) / 2 + (CARD_WIDTH * scale) / 2;
    const y = this.handY;

    const meldInfo = findBestMelds(hand);

    hand.forEach((card, i) => {
      const x = startX + i * spacing;

      const sprite = this.createCardFace(card, x, y, scale) as CardSprite;
      sprite.cardData = card;
      sprite.cardIndex = i;
      sprite.originalX = x;
      sprite.originalY = y;
      sprite.setDepth(20 + i);

      // Highlight melds with subtle glow
      const isInMeld = meldInfo.melds.some((m) =>
        m.cards.some((c) => c.rank === card.rank && c.suit === card.suit)
      );
      if (isInMeld) {
        const glow = this.add.graphics();
        glow.lineStyle(2, 0x00FF00, 0.6);
        glow.strokeRoundedRect(
          -CARD_WIDTH * scale / 2 - 2,
          -CARD_HEIGHT * scale / 2 - 2,
          CARD_WIDTH * scale + 4,
          CARD_HEIGHT * scale + 4,
          6
        );
        sprite.add(glow);
      }

      // Setup drag & drop
      this.setupCardDrag(sprite, i);

      this.playerHandSprites.push(sprite);
    });
  }

  private renderOpponentHand(): void {
    this.opponentHandSprites.forEach((s) => s.destroy());
    this.opponentHandSprites = [];

    const hand = this.gameLogic.player2Hand;
    const w = +this.game.config.width;
    const scale = this.isMobile ? CARD_DISPLAY_SCALE_MOBILE : CARD_DISPLAY_SCALE;
    const spacing = this.isMobile ? HAND_CARD_SPACING_MOBILE : HAND_CARD_SPACING;
    const y = this.isMobile ? 85 : 100;

    const totalWidth = (hand.length - 1) * spacing + CARD_WIDTH * scale;
    const startX = (w - totalWidth) / 2 + (CARD_WIDTH * scale) / 2;

    const showFaceUp =
      this.gameLogic.state === GinRummyState.ROUND_OVER ||
      this.gameLogic.state === GinRummyState.GAME_OVER;

    hand.forEach((card, i) => {
      const x = startX + i * spacing;
      let sprite: Phaser.GameObjects.Container;

      if (showFaceUp) {
        sprite = this.createCardFace(card, x, y, scale);
      } else {
        sprite = this.createCardBack(x, y, scale);
      }
      sprite.setDepth(20 + i);
      this.opponentHandSprites.push(sprite);
    });
  }

  private renderButtons(): void {
    const state = this.gameLogic.state;
    const isDiscardPhase = state === GinRummyState.PLAYER_TURN_DISCARD;
    const isRoundOver =
      state === GinRummyState.ROUND_OVER || state === GinRummyState.GAME_OVER;

    const canKnock = isDiscardPhase && this.gameLogic.canKnock();
    this.knockButton.setVisible(canKnock);

    this.newRoundButton.setVisible(
      state === GinRummyState.ROUND_OVER && !this.gameLogic.isGameOver
    );
    this.newGameButton.setVisible(isRoundOver);
  }

  private renderDeadwood(): void {
    if (
      this.gameLogic.state === GinRummyState.PLAYER_TURN_DISCARD ||
      this.gameLogic.state === GinRummyState.PLAYER_TURN_DRAW
    ) {
      const dw = this.gameLogic.getPlayerDeadwood(1);
      this.deadwoodText.setText(`Deadwood: ${dw}`);
      this.deadwoodText.setVisible(true);
    } else {
      this.deadwoodText.setVisible(false);
    }
  }

  private updateStatus(): void {
    const state = this.gameLogic.state;

    if (
      state === GinRummyState.ROUND_OVER ||
      state === GinRummyState.GAME_OVER ||
      state === GinRummyState.KNOCKING ||
      state === GinRummyState.GIN
    ) {
      this.statusText.setVisible(false);
      return;
    }

    this.statusText.setVisible(true);

    switch (state) {
      case GinRummyState.PLAYER_TURN_DRAW:
        this.statusText.setText('Tap stock or discard pile to draw');
        break;
      case GinRummyState.PLAYER_TURN_DISCARD:
        this.statusText.setText('Drag a card to the middle to discard');
        break;
      case GinRummyState.OPPONENT_TURN_DRAW:
      case GinRummyState.OPPONENT_TURN_DISCARD:
        this.statusText.setText('AI is thinking...');
        break;
      default:
        this.statusText.setText(this.gameLogic.statusMessage);
    }
  }

  // --- Round Result Display ---

  private showRoundResult(result: RoundResult): void {
    this.clearRoundResult();

    const w = +this.game.config.width;
    const h = +this.game.config.height;
    this.roundResultContainer = this.add.container(0, 0).setDepth(80);

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);
    this.roundResultContainer.add(overlay);

    // Make overlay block clicks
    const blocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0);
    blocker.setInteractive();
    this.roundResultContainer.add(blocker);

    // Result panel
    const panelW = this.isMobile ? w - 40 : 500;
    const panelH = this.isMobile ? 280 : 300;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2 - 30;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a3a2a, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(3, 0xFFD700, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
    this.roundResultContainer.add(panel);

    // Title
    let title: string;
    let titleColor: string;
    if (result.isGin) {
      title = result.knocker === 1 ? 'GIN! You Win!' : 'GIN! AI Wins!';
      titleColor = result.knocker === 1 ? '#00FF00' : '#FF4444';
    } else if (result.isUndercut) {
      title = result.pointsWinner === 1 ? 'UNDERCUT! You Win!' : 'UNDERCUT! AI Wins!';
      titleColor = result.pointsWinner === 1 ? '#00FF00' : '#FF4444';
    } else {
      title = result.pointsWinner === 1 ? 'You Win the Round!' : 'AI Wins the Round!';
      titleColor = result.pointsWinner === 1 ? '#00FF00' : '#FF4444';
    }

    this.roundResultContainer.add(
      this.add.text(w / 2, panelY + 30, title, {
        fontSize: this.isMobile ? '22px' : '26px',
        color: titleColor,
        fontStyle: 'bold',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5)
    );

    const details = [
      `Your deadwood: ${result.player1Deadwood}  |  AI deadwood: ${result.player2Deadwood}`,
      `Points awarded: ${result.pointsAwarded} to ${result.pointsWinner === 1 ? 'You' : 'AI'}`,
      `Your melds: ${result.player1Melds.length}  |  AI melds: ${result.player2Melds.length}`,
      '',
      `Score:  You ${this.gameLogic.player1Score}  -  AI ${this.gameLogic.player2Score}`,
    ];

    if (this.gameLogic.isGameOver) {
      const winner = this.gameLogic.winner;
      details.push('');
      details.push(winner === 1 ? 'GAME OVER - YOU WIN!' : 'GAME OVER - AI WINS!');
    }

    details.forEach((line, i) => {
      this.roundResultContainer!.add(
        this.add.text(w / 2, panelY + 75 + i * 28, line, {
          fontSize: this.isMobile ? '13px' : '15px',
          color: COLORS.WHITE,
          align: 'center',
          fontStyle: line.includes('GAME OVER') ? 'bold' : 'normal',
        }).setOrigin(0.5)
      );
    });

    // Reposition buttons
    const btnY = panelY + panelH + 25;
    this.newRoundButton.setPosition(w / 2 - 80, btnY);
    this.newGameButton.setPosition(w / 2 + 80, btnY);
  }

  private clearRoundResult(): void {
    if (this.roundResultContainer) {
      this.roundResultContainer.destroy();
      this.roundResultContainer = null;
    }
  }

  // --- Card Rendering Helpers ---

  private createCardFace(
    card: Card,
    x: number,
    y: number,
    scale: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const cw = CARD_WIDTH * scale;
    const ch = CARD_HEIGHT * scale;

    if (this.usingSprites) {
      const sprite = this.add.image(0, 0, ASSET_KEYS.CARDS, card.spriteFrame);
      sprite.setScale(scale);
      container.add(sprite);
    } else {
      const bg = this.add.graphics();
      bg.fillStyle(0xFFFFFF, 1);
      bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      bg.lineStyle(1.5, 0x333333, 1);
      bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      container.add(bg);

      const isRed = card.suit === Suit.DIAMONDS || card.suit === Suit.HEARTS;
      const color = isRed ? '#CC0000' : '#000000';

      const display = `${RANK_DISPLAY[card.rank]}${SUIT_DISPLAY[card.suit]}`;
      const topText = this.add.text(-cw / 2 + 5, -ch / 2 + 4, display, {
        fontSize: `${Math.max(10, Math.floor(14 * scale / 0.45))}px`,
        color,
        fontStyle: 'bold',
      });
      container.add(topText);

      const centerSuit = this.add.text(0, 0, SUIT_DISPLAY[card.suit], {
        fontSize: `${Math.max(18, Math.floor(32 * scale / 0.45))}px`,
        color,
      }).setOrigin(0.5);
      container.add(centerSuit);

      const bottomText = this.add.text(cw / 2 - 5, ch / 2 - 4, display, {
        fontSize: `${Math.max(10, Math.floor(14 * scale / 0.45))}px`,
        color,
        fontStyle: 'bold',
      }).setOrigin(1, 1);
      container.add(bottomText);
    }

    return container;
  }

  private createCardBack(
    x: number,
    y: number,
    scale: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const cw = CARD_WIDTH * scale;
    const ch = CARD_HEIGHT * scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a237e, 1);
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
    bg.lineStyle(1.5, 0xFFFFFF, 0.6);
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);

    bg.lineStyle(1, 0x3949ab, 0.5);
    const inset = 4;
    bg.strokeRect(-cw / 2 + inset, -ch / 2 + inset, cw - inset * 2, ch - inset * 2);

    const step = 8;
    for (let i = -cw; i < cw + ch; i += step) {
      bg.lineBetween(
        Math.max(-cw / 2 + inset, -cw / 2 + inset + i),
        Math.max(-ch / 2 + inset, -ch / 2 + inset - i + cw - inset * 2),
        Math.min(cw / 2 - inset, -cw / 2 + inset + i + ch - inset * 2),
        Math.min(ch / 2 - inset, -ch / 2 + inset)
      );
    }

    container.add(bg);
    return container;
  }
}

export { GIN_RUMMY_GAME_SCENE_KEY };
