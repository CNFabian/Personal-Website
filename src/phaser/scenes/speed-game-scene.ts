import * as Phaser from 'phaser';
import {
  COLORS,
  CARD_WIDTH,
  CARD_HEIGHT,
  ASSET_KEYS,
  RANK_DISPLAY,
  SUIT_DISPLAY,
  isMobileDevice,
  isPortrait,
  AuthUser,
} from '../common';
import { Card } from '../lib/card';
import { Speed, SpeedGameState } from '../lib/speed';
import type { Socket } from 'socket.io-client';

export const SPEED_GAME_SCENE_KEY = 'SpeedGameScene';

// Layout constants
const CARD_SCALE = 0.45;
const CARD_SCALE_MOBILE = 0.35;
const HAND_SPACING = 58;
const HAND_SPACING_MOBILE = 44;
const DRAG_THRESHOLD = 8;

interface CardSpriteData {
  cardData: any;
  handIndex: number;
  originalX: number;
  originalY: number;
  playerOwner: 1 | 2;
}

type CardSprite = Phaser.GameObjects.Container & CardSpriteData;

interface SpeedSceneData {
  multiplayer?: boolean;
  playerNumber?: 1 | 2;
  roomCode?: string;
  socket?: Socket;
  authUser?: AuthUser;
  playerInfo?: Record<number, { username: string; wins?: number }>;
}

export class SpeedGameScene extends Phaser.Scene {
  private gameLogic!: Speed;
  private isMobile = false;

  // Multiplayer
  private isMultiplayer = false;
  private myPlayerNumber: 1 | 2 = 1;
  private roomCode = '';
  private socket: Socket | null = null;
  private authUser: AuthUser | null = null;
  private playerInfo: Record<number, { username: string; wins?: number }> = {};

  // Card sprites
  private myHandSprites: CardSprite[] = [];
  private opponentHandSprites: Phaser.GameObjects.Container[] = [];
  private centerLeftSprite: Phaser.GameObjects.Container | null = null;
  private centerRightSprite: Phaser.GameObjects.Container | null = null;

  // UI elements
  private statusText!: Phaser.GameObjects.Text;
  private myDrawCountText!: Phaser.GameObjects.Text;
  private oppDrawCountText!: Phaser.GameObjects.Text;
  private myNameText!: Phaser.GameObjects.Text;
  private oppNameText!: Phaser.GameObjects.Text;
  private flipButton!: Phaser.GameObjects.Container;
  private rematchButton!: Phaser.GameObjects.Container;
  private resultOverlay: Phaser.GameObjects.Container | null = null;

  // Drag state
  private draggedSprite: CardSprite | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;

  // Layout positions
  private myHandY = 0;
  private oppHandY = 0;
  private centerY = 0;
  private centerLeftX = 0;
  private centerRightX = 0;

  // Using sprite sheet?
  private usingSprites = false;

  // Drop zone visuals
  private leftDropZone: Phaser.GameObjects.Rectangle | null = null;
  private rightDropZone: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super({ key: SPEED_GAME_SCENE_KEY });
  }

  init(data?: SpeedSceneData): void {
    this.isMultiplayer = !!data?.multiplayer;
    this.myPlayerNumber = data?.playerNumber || 1;
    this.roomCode = data?.roomCode || '';
    this.socket = data?.socket || null;
    this.authUser = data?.authUser || null;
    this.playerInfo = data?.playerInfo || {};
    this.isMobile = isMobileDevice();
  }

  create(): void {
    this.usingSprites = this.textures.exists(ASSET_KEYS.CARDS);

    const w = +this.game.config.width;
    const h = +this.game.config.height;

    this.centerY = this.isMobile ? h * 0.42 : h / 2;
    this.myHandY = h - (this.isMobile ? 110 : 140);
    this.oppHandY = this.isMobile ? 110 : 140;
    this.centerLeftX = w / 2 - (this.isMobile ? 55 : 75);
    this.centerRightX = w / 2 + (this.isMobile ? 55 : 75);

    this.createBackground();
    this.createUI();
    this.setupSceneDrag();

    if (this.isMultiplayer && this.socket) {
      this.setupMultiplayer();
    } else {
      // Should not happen (no single player), but fallback
      this.gameLogic = new Speed();
      this.renderAll();
    }
  }

  // ---- Background ----

  private createBackground(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a5f38, 1);
    bg.fillRect(0, 0, w, h);

    bg.lineStyle(4, 0x8B4513, 1);
    bg.strokeRect(10, 10, w - 20, h - 20);

    // Subtle grid
    bg.lineStyle(1, 0x0b6b40, 0.3);
    for (let i = 0; i < w; i += 40) bg.lineBetween(i, 0, i, h);
    for (let i = 0; i < h; i += 40) bg.lineBetween(0, i, w, i);

    this.add.text(w / 2, this.isMobile ? 20 : 25, 'SPEED', {
      fontSize: this.isMobile ? '22px' : '30px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5, 0).setDepth(10);
  }

  // ---- UI ----

  private createUI(): void {
    const w = +this.game.config.width;
    const h = +this.game.config.height;
    const fs = this.isMobile ? '13px' : '16px';

    // Status message
    this.statusText = this.add.text(w / 2, this.centerY + (this.isMobile ? 55 : 65), '', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(50);

    // Player names
    const myName = this.playerInfo[this.myPlayerNumber]?.username || `Player ${this.myPlayerNumber}`;
    const oppNum = this.myPlayerNumber === 1 ? 2 : 1;
    const oppName = this.playerInfo[oppNum]?.username || `Player ${oppNum}`;

    this.myNameText = this.add.text(20, this.myHandY - 35, myName, {
      fontSize: fs, color: COLORS.GOLD, fontStyle: 'bold',
    }).setDepth(10);

    this.oppNameText = this.add.text(20, this.oppHandY + (this.isMobile ? 45 : 55), oppName, {
      fontSize: fs, color: COLORS.LIGHT_GRAY, fontStyle: 'bold',
    }).setDepth(10);

    // Draw pile counts
    this.myDrawCountText = this.add.text(w - 20, this.myHandY - 35, '', {
      fontSize: fs, color: COLORS.WHITE,
    }).setOrigin(1, 0).setDepth(10);

    this.oppDrawCountText = this.add.text(w - 20, this.oppHandY + (this.isMobile ? 45 : 55), '', {
      fontSize: fs, color: COLORS.WHITE,
    }).setOrigin(1, 0).setDepth(10);

    // Flip button (shown when stalled)
    this.flipButton = this.createButton(
      w / 2,
      this.centerY + (this.isMobile ? 100 : 115),
      'FLIP',
      0xE67E22,
      () => this.onFlip()
    );
    this.flipButton.setVisible(false);

    // Rematch button
    this.rematchButton = this.createButton(
      w / 2,
      this.centerY + (this.isMobile ? 100 : 115),
      'REMATCH',
      0x27AE60,
      () => this.onRematch()
    );
    this.rematchButton.setVisible(false);

    // Drop zone highlights (shown during drag)
    this.leftDropZone = this.add.rectangle(
      this.centerLeftX, this.centerY,
      CARD_WIDTH * this.getScale() + 16,
      CARD_HEIGHT * this.getScale() + 16
    );
    this.leftDropZone.setStrokeStyle(3, 0xFFD700, 0.8);
    this.leftDropZone.setFillStyle(0xFFD700, 0.1);
    this.leftDropZone.setDepth(4);
    this.leftDropZone.setVisible(false);

    this.rightDropZone = this.add.rectangle(
      this.centerRightX, this.centerY,
      CARD_WIDTH * this.getScale() + 16,
      CARD_HEIGHT * this.getScale() + 16
    );
    this.rightDropZone.setStrokeStyle(3, 0xFFD700, 0.8);
    this.rightDropZone.setFillStyle(0xFFD700, 0.1);
    this.rightDropZone.setDepth(4);
    this.rightDropZone.setVisible(false);

    // Back button
    const backBtn = this.createSmallButton(
      this.isMobile ? 45 : 55,
      this.isMobile ? 20 : 25,
      '← EXIT',
      0x7F8C8D,
      () => {
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
        }
        window.location.href = '/casino';
      }
    );
    backBtn.setDepth(100);
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(60);
    const bw = this.isMobile ? 100 : 120;
    const bh = this.isMobile ? 40 : 46;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0xFFFFFF, 0.5);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);

    const text = this.add.text(0, 0, label, {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => container.setScale(1.05));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => {
      container.setScale(0.95);
    });
    container.on('pointerup', () => {
      container.setScale(1);
      callback();
    });

    return container;
  }

  private createSmallButton(x: number, y: number, label: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(60);
    const bw = this.isMobile ? 60 : 70;
    const bh = this.isMobile ? 24 : 28;

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.85);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 5);
    bg.lineStyle(1, 0xFFFFFF, 0.4);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 5);

    const text = this.add.text(0, 0, label, {
      fontSize: this.isMobile ? '10px' : '12px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(bw, bh);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', callback);

    return container;
  }

  // ---- Multiplayer ----

  private setupMultiplayer(): void {
    if (!this.socket) return;

    this.socket.on('gameStateUpdate', (state: any) => {
      this.updateFromServerState(state);
    });

    this.socket.on('winRecorded', (data: any) => {
      // Update win counts
      for (const pn of [1, 2]) {
        if (data[pn] && this.playerInfo[pn]) {
          this.playerInfo[pn].wins = data[pn].wins;
        }
      }
    });

    this.socket.on('opponentDisconnected', () => {
      this.statusText.setText('Opponent disconnected!');
    });
  }

  private updateFromServerState(state: any): void {
    // Rebuild a local representation from the serialized state
    this.renderFromState(state);
  }

  // ---- Drag & Drop ----

  private setupSceneDrag(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggedSprite) return;

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > DRAG_THRESHOLD) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        this.draggedSprite.x = this.draggedSprite.originalX + dx;
        this.draggedSprite.y = this.draggedSprite.originalY + dy;

        // Show drop zone highlights
        this.updateDropZoneHighlights(this.draggedSprite);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggedSprite) return;

      const sprite = this.draggedSprite;
      const wasDragging = this.isDragging;

      this.draggedSprite = null;
      this.isDragging = false;
      this.hideDropZones();

      if (wasDragging) {
        // Check which center pile the card was dropped on
        const targetPile = this.getDropTarget(pointer.x, pointer.y);
        if (targetPile) {
          this.attemptPlay(sprite.handIndex, targetPile);
        }

        // Snap back to original position
        sprite.x = sprite.originalX;
        sprite.y = sprite.originalY;
        sprite.setDepth(20 + sprite.handIndex);
      } else {
        // Tap — try to auto-play on nearest valid pile
        this.attemptAutoPlay(sprite.handIndex);
        sprite.setDepth(20 + sprite.handIndex);
      }
    });
  }

  private setupCardDrag(sprite: CardSprite, index: number): void {
    const scale = this.getScale();
    sprite.setSize(CARD_WIDTH * scale, CARD_HEIGHT * scale);
    sprite.setInteractive({ useHandCursor: true, draggable: false });

    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.resultOverlay) return;

      this.draggedSprite = sprite;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.isDragging = false;
      sprite.setDepth(100);
    });
  }

  private getDropTarget(x: number, y: number): 'left' | 'right' | null {
    const scale = this.getScale();
    const cardW = CARD_WIDTH * scale;
    const cardH = CARD_HEIGHT * scale;
    const margin = 20;

    // Check left pile
    if (
      x > this.centerLeftX - cardW / 2 - margin &&
      x < this.centerLeftX + cardW / 2 + margin &&
      y > this.centerY - cardH / 2 - margin &&
      y < this.centerY + cardH / 2 + margin
    ) {
      return 'left';
    }

    // Check right pile
    if (
      x > this.centerRightX - cardW / 2 - margin &&
      x < this.centerRightX + cardW / 2 + margin &&
      y > this.centerY - cardH / 2 - margin &&
      y < this.centerY + cardH / 2 + margin
    ) {
      return 'right';
    }

    return null;
  }

  private updateDropZoneHighlights(sprite: CardSprite): void {
    // Show valid drop zones based on the dragged card
    this.leftDropZone?.setVisible(true);
    this.rightDropZone?.setVisible(true);
  }

  private hideDropZones(): void {
    this.leftDropZone?.setVisible(false);
    this.rightDropZone?.setVisible(false);
  }

  // ---- Game Actions ----

  private attemptPlay(handIndex: number, targetPile: 'left' | 'right'): void {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('speedPlayCard', {
        roomCode: this.roomCode,
        player: this.myPlayerNumber,
        handIndex,
        targetPile,
      });
    }
  }

  private attemptAutoPlay(handIndex: number): void {
    // Try left first, then right
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('speedPlayCard', {
        roomCode: this.roomCode,
        player: this.myPlayerNumber,
        handIndex,
        targetPile: 'auto', // Server will try both
      });
    }
  }

  private onFlip(): void {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('speedFlip', {
        roomCode: this.roomCode,
        player: this.myPlayerNumber,
      });
    }
  }

  private onRematch(): void {
    if (this.isMultiplayer && this.socket) {
      this.socket.emit('restartSpeedGame', {
        roomCode: this.roomCode,
      });
    }
  }

  // ---- Rendering ----

  private getScale(): number {
    return this.isMobile ? CARD_SCALE_MOBILE : CARD_SCALE;
  }

  private getSpacing(): number {
    return this.isMobile ? HAND_SPACING_MOBILE : HAND_SPACING;
  }

  private renderFromState(state: any): void {
    // Determine which hand is "mine" based on playerNumber
    const myHand = this.myPlayerNumber === 1 ? state.p1Hand : state.p2Hand;
    const oppHand = this.myPlayerNumber === 1 ? state.p2Hand : state.p1Hand;
    const myDrawCount = this.myPlayerNumber === 1 ? state.p1DrawCount : state.p2DrawCount;
    const oppDrawCount = this.myPlayerNumber === 1 ? state.p2DrawCount : state.p1DrawCount;

    this.renderMyHand(myHand);
    this.renderOpponentHand(oppHand);
    this.renderCenterPiles(state.centerLeftTop, state.centerRightTop, state.centerLeftCount, state.centerRightCount);
    this.renderDrawCounts(myDrawCount, oppDrawCount);
    this.statusText.setText(state.statusMessage || '');

    // Show flip button when stalled
    const isStalled = state.gameState === 'STALLED';
    this.flipButton.setVisible(isStalled);

    // Show game over
    if (state.gameState === 'GAME_OVER' && state.winner !== null) {
      this.flipButton.setVisible(false);
      const iWon = state.winner === this.myPlayerNumber;
      this.showGameOver(iWon, state.winner);
    } else if (this.resultOverlay) {
      this.resultOverlay.destroy();
      this.resultOverlay = null;
      this.rematchButton.setVisible(false);
    }
  }

  private renderAll(): void {
    // Local mode fallback (not used for multiplayer-only, but safety net)
    if (!this.gameLogic) return;
    const state = this.gameLogic.serialize();
    this.renderFromState(state);
  }

  private renderMyHand(hand: any[]): void {
    // Clear old sprites
    this.myHandSprites.forEach(s => s.destroy());
    this.myHandSprites = [];

    const w = +this.game.config.width;
    const spacing = this.getSpacing();
    const totalWidth = (hand.length - 1) * spacing;
    const startX = w / 2 - totalWidth / 2;

    hand.forEach((cardData, i) => {
      const x = startX + i * spacing;
      const y = this.myHandY;

      const sprite = this.createCardSprite(cardData, x, y) as CardSprite;
      sprite.handIndex = i;
      sprite.cardData = cardData;
      sprite.originalX = x;
      sprite.originalY = y;
      sprite.playerOwner = this.myPlayerNumber;
      sprite.setDepth(20 + i);

      this.setupCardDrag(sprite, i);
      this.myHandSprites.push(sprite);
    });
  }

  private renderOpponentHand(hand: any[]): void {
    // Clear old
    this.opponentHandSprites.forEach(s => s.destroy());
    this.opponentHandSprites = [];

    const w = +this.game.config.width;
    const spacing = this.getSpacing();
    const totalWidth = (hand.length - 1) * spacing;
    const startX = w / 2 - totalWidth / 2;

    hand.forEach((_cardData, i) => {
      const x = startX + i * spacing;
      const y = this.oppHandY;

      // Opponent cards shown face-down
      const sprite = this.createCardBack(x, y);
      sprite.setDepth(20 + i);
      this.opponentHandSprites.push(sprite);
    });
  }

  private renderCenterPiles(leftTop: any, rightTop: any, leftCount: number, rightCount: number): void {
    // Destroy old
    this.centerLeftSprite?.destroy();
    this.centerRightSprite?.destroy();

    if (leftTop) {
      this.centerLeftSprite = this.createCardSprite(leftTop, this.centerLeftX, this.centerY);
      this.centerLeftSprite.setDepth(5);
    }
    if (rightTop) {
      this.centerRightSprite = this.createCardSprite(rightTop, this.centerRightX, this.centerY);
      this.centerRightSprite.setDepth(5);
    }

    // Pile count labels below center
    const labelY = this.centerY + (this.isMobile ? 42 : 50);
    // Remove old labels if any
    this.children.getByName('centerLeftLabel')?.destroy();
    this.children.getByName('centerRightLabel')?.destroy();

    this.add.text(this.centerLeftX, labelY, `${leftCount}`, {
      fontSize: '11px', color: COLORS.LIGHT_GRAY,
    }).setOrigin(0.5).setDepth(10).setName('centerLeftLabel');

    this.add.text(this.centerRightX, labelY, `${rightCount}`, {
      fontSize: '11px', color: COLORS.LIGHT_GRAY,
    }).setOrigin(0.5).setDepth(10).setName('centerRightLabel');
  }

  private renderDrawCounts(myCount: number, oppCount: number): void {
    this.myDrawCountText.setText(`Draw: ${myCount}`);
    this.oppDrawCountText.setText(`Draw: ${oppCount}`);
  }

  // ---- Card sprite creation ----

  private createCardSprite(cardData: any, x: number, y: number): Phaser.GameObjects.Container {
    const scale = this.getScale();
    const container = this.add.container(x, y);

    if (this.usingSprites && cardData.spriteFrame !== undefined) {
      const cardImg = this.add.image(0, 0, ASSET_KEYS.CARDS, cardData.spriteFrame);
      cardImg.setScale(scale);
      container.add(cardImg);
    } else {
      // Fallback: draw card with graphics
      const cw = CARD_WIDTH * scale;
      const ch = CARD_HEIGHT * scale;

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);

      const textColor = cardData.color === 'red' ? '#CC0000' : '#000000';
      const fontSize = this.isMobile ? '16px' : '20px';

      const valueText = this.add.text(0, -ch / 6, cardData.displayValue || '', {
        fontSize, color: textColor, fontStyle: 'bold',
      }).setOrigin(0.5);

      const suitText = this.add.text(0, ch / 6, cardData.displaySuit || '', {
        fontSize: this.isMobile ? '18px' : '24px', color: textColor,
      }).setOrigin(0.5);

      container.add([bg, valueText, suitText]);
    }

    return container;
  }

  private createCardBack(x: number, y: number): Phaser.GameObjects.Container {
    const scale = this.getScale();
    const container = this.add.container(x, y);

    if (this.usingSprites) {
      // Card back is typically last frame (frame 52)
      const cardImg = this.add.image(0, 0, ASSET_KEYS.CARDS, 52);
      cardImg.setScale(scale);
      container.add(cardImg);
    } else {
      const cw = CARD_WIDTH * scale;
      const ch = CARD_HEIGHT * scale;

      const bg = this.add.graphics();
      bg.fillStyle(0x1a237e, 1);
      bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 6);

      // Diamond pattern
      bg.lineStyle(1, 0x3949ab, 0.5);
      for (let i = -cw / 2 + 8; i < cw / 2; i += 12) {
        bg.lineBetween(i, -ch / 2 + 8, i, ch / 2 - 8);
      }

      container.add(bg);
    }

    return container;
  }

  // ---- Game Over ----

  private showGameOver(iWon: boolean, winnerNum: number): void {
    if (this.resultOverlay) return;

    const w = +this.game.config.width;
    const h = +this.game.config.height;

    this.resultOverlay = this.add.container(0, 0).setDepth(200);

    // Dim overlay
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    this.resultOverlay.add(dim);

    const winnerName = this.playerInfo[winnerNum]?.username || `Player ${winnerNum}`;
    const title = iWon ? 'YOU WIN!' : 'YOU LOSE';
    const titleColor = iWon ? '#FFD700' : '#FF4444';

    const titleText = this.add.text(w / 2, h / 2 - 40, title, {
      fontSize: this.isMobile ? '36px' : '48px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.resultOverlay.add(titleText);

    const subText = this.add.text(w / 2, h / 2 + 10, `${winnerName} cleared all their cards!`, {
      fontSize: this.isMobile ? '14px' : '18px',
      color: COLORS.WHITE,
    }).setOrigin(0.5);
    this.resultOverlay.add(subText);

    this.rematchButton.setVisible(true);
  }
}
