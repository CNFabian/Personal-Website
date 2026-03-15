import * as Phaser from 'phaser';
import { COLORS, isMobileDevice } from '../common';
import { AvatarSprite } from '../avatar/AvatarSprite';
import type { AvatarData } from '../avatar/AvatarRenderer';
import { CASINO_SCENE_KEYS } from './casino-preload-scene';

const CASINO_LOBBY_KEY = 'CasinoLobbyScene';

interface InteractionZone {
  zone: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  isActive: boolean;
  promptText: Phaser.GameObjects.Text;
  gameType: string;
}

export class CasinoLobbyScene extends Phaser.Scene {
  private player: AvatarSprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: any = null;
  private chipCountText: Phaser.GameObjects.Text | null = null;
  private instructionsText: Phaser.GameObjects.Text | null = null;
  private interactionZones: InteractionZone[] = [];
  private playerInZone: InteractionZone | null = null;
  private roomWidth = 1600;
  private roomHeight = 1200;

  // Mobile controls
  private joystickOuter: Phaser.GameObjects.Arc | null = null;
  private joystickInner: Phaser.GameObjects.Arc | null = null;
  private joystickBase: { x: number; y: number } = { x: 0, y: 0 };
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private joystickActive = false;
  private joystickPointerId: number | null = null;
  private interactButton: Phaser.GameObjects.Container | null = null;
  private isMobile = false;

  constructor() {
    super({ key: CASINO_LOBBY_KEY });
  }

  create(): void {
    console.log('CasinoLobbyScene: Creating lobby...');

    // Create the casino floor
    this.createFloor();
    this.createDecor();

    // Create player avatar first (needed for colliders)
    this.createPlayer();

    // Create walls and colliders
    this.createWalls();

    // Create interaction zones
    this.createGameTables();

    // Setup camera
    this.setupCamera();

    // Setup input
    this.setupInput();

    // Create UI
    this.createUI();

    // Create overlap detection
    this.createOverlapDetection();
  }

  private createFloor(): void {
    // Use the generated carpet texture
    const carpetKey = CASINO_SCENE_KEYS.CARPET_TEXTURE;

    // Tile the carpet across the entire room
    const tileSize = 256;
    for (let x = 0; x < this.roomWidth; x += tileSize) {
      for (let y = 0; y < this.roomHeight; y += tileSize) {
        this.add.image(x, y, carpetKey).setOrigin(0, 0);
      }
    }

    // Add a dark border/shadow effect at the edges
    const borderGraphics = this.add.graphics();
    borderGraphics.lineStyle(8, 0x8B4513, 1);
    borderGraphics.strokeRect(0, 0, this.roomWidth, this.roomHeight);
  }

  private createWalls(): void {
    // Create static physics bodies for walls (no collision pass-through)
    const wallThickness = 30;
    const wallsGroup = this.physics.add.staticGroup();

    // Top wall
    const topWallBody = wallsGroup.create(this.roomWidth / 2, wallThickness / 2) as Phaser.Physics.Arcade.Sprite;
    topWallBody.body!.setSize(this.roomWidth, wallThickness);

    // Bottom wall
    const bottomWallBody = wallsGroup.create(this.roomWidth / 2, this.roomHeight - wallThickness / 2) as Phaser.Physics.Arcade.Sprite;
    bottomWallBody.body!.setSize(this.roomWidth, wallThickness);

    // Left wall
    const leftWallBody = wallsGroup.create(wallThickness / 2, this.roomHeight / 2) as Phaser.Physics.Arcade.Sprite;
    leftWallBody.body!.setSize(wallThickness, this.roomHeight);

    // Right wall
    const rightWallBody = wallsGroup.create(this.roomWidth - wallThickness / 2, this.roomHeight / 2) as Phaser.Physics.Arcade.Sprite;
    rightWallBody.body!.setSize(wallThickness, this.roomHeight);

    // Add collider with player when player is ready
    if (this.player) {
      this.physics.add.collider(this.player.getBody(), wallsGroup);
    }
  }

  private createDecor(): void {
    // Potted plants (green circles)
    const plantPositions = [
      { x: 150, y: 150 },
      { x: this.roomWidth - 150, y: 150 },
      { x: 150, y: this.roomHeight - 150 },
      { x: this.roomWidth - 150, y: this.roomHeight - 150 },
    ];

    plantPositions.forEach((pos) => {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x2d5a2d, 1);
      graphics.fillCircle(0, 0, 25);
      graphics.generateTexture('plant', 50, 50);
      this.add.image(pos.x, pos.y, 'plant').setDepth(5);
      graphics.destroy();
    });

    // Chandeliers (gold circles near the ceiling)
    const chandelierX = [this.roomWidth / 4, (this.roomWidth * 3) / 4];
    chandelierX.forEach((x) => {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffd700, 0.7);
      graphics.fillCircle(0, 0, 20);
      graphics.generateTexture('chandelier', 40, 40);
      this.add.image(x, 80, 'chandelier').setDepth(5);
      graphics.destroy();
    });

    // Leaderboard board on one wall
    const boardGraphics = this.add.graphics();
    boardGraphics.fillStyle(0x8B4513, 1);
    boardGraphics.fillRect(0, 0, 200, 250);
    boardGraphics.lineStyle(4, 0xffd700, 1);
    boardGraphics.strokeRect(0, 0, 200, 250);
    boardGraphics.generateTexture('leaderboard', 200, 250);
    const boardImage = this.add.image(
      this.roomWidth - 120,
      this.roomHeight / 2,
      'leaderboard'
    ).setOrigin(0.5);
    boardImage.setDepth(5);

    // Leaderboard text
    this.add.text(
      this.roomWidth - 120,
      this.roomHeight / 2 - 90,
      'LEADERBOARD',
      {
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold',
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(6);

    this.add.text(
      this.roomWidth - 120,
      this.roomHeight / 2 - 20,
      'Top Players',
      {
        fontSize: '12px',
        color: '#FFFFFF',
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(6);

    boardGraphics.destroy();
  }

  private createPlayer(): void {
    const avatarData = this.registry.get('avatarData') as AvatarData | null;
    const username = this.registry.get('username') as string;

    // Fallback avatar if data is missing
    const defaultAvatarData: AvatarData = {
      body: 0,
      skinColor: '#E8B48A',
      hair: 0,
      hairColor: '#3D2817',
      eyes: 0,
      top: 0,
      topColor: '#E94560',
      bottom: 0,
      bottomColor: '#2C3E50',
      hat: -1,
      hatColor: '#FFD700',
    };

    const data = avatarData || defaultAvatarData;
    const name = username || 'Player';

    try {
      this.player = new AvatarSprite(
        this,
        this.roomWidth / 2,
        this.roomHeight / 2,
        data,
        name
      );
    } catch (err) {
      console.warn('Failed to create avatar sprite, using placeholder:', err);
      // Create a simple placeholder if AvatarSprite fails
      const placeholder = this.add.circle(
        this.roomWidth / 2,
        this.roomHeight / 2,
        20,
        0x00ccff
      );
      this.physics.add.existing(placeholder);
      const body = placeholder.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setBounce(0, 0);

      // Store minimal player data as fallback
      (this as any).playerPlaceholder = placeholder;
    }
  }

  private createGameTables(): void {
    // Create Egyptian Ratscrew table
    this.createGameTable(
      this.roomWidth / 2 - 200,
      200,
      'EGYPTIAN\nRATSCREW',
      120,
      100,
      'ratscrew'
    );

    // Create Gin Rummy table
    this.createGameTable(
      this.roomWidth / 2,
      200,
      'GIN\nRUMMY',
      120,
      100,
      'gin-rummy'
    );

    // Create Speed table
    this.createGameTable(
      this.roomWidth / 2 + 200,
      200,
      'SPEED',
      120,
      100,
      'speed'
    );
  }

  private createGameTable(
    x: number,
    y: number,
    label: string,
    width: number,
    height: number,
    gameType: string
  ): void {
    // Table background
    const graphics = this.add.graphics();
    graphics.fillStyle(0x654321, 1);
    graphics.fillRect(x - width / 2, y - height / 2, width, height);
    graphics.lineStyle(3, 0xffd700, 1);
    graphics.strokeRect(x - width / 2, y - height / 2, width, height);
    graphics.generateTexture(`table_${gameType}`, width, height);
    this.add.image(x, y, `table_${gameType}`).setDepth(5);

    // Table label
    this.add.text(x, y, label, {
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 20 },
    }).setOrigin(0.5).setDepth(6);

    graphics.destroy();

    // Create interaction zone as an invisible rectangle with physics body
    const zoneSize = 100;
    const zoneRect = this.add.rectangle(x, y + height / 2 + 50, zoneSize, zoneSize);
    zoneRect.setVisible(false);
    this.physics.add.existing(zoneRect, true);
    const zoneBody = zoneRect.body as Phaser.Physics.Arcade.Body;

    // Create prompt text (only used on desktop — mobile uses the interact button)
    const promptLabel = isMobileDevice() ? '' : 'Press E to play';
    const promptText = this.add.text(x, y + height / 2 + 60, promptLabel, {
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setVisible(false).setDepth(100);

    this.interactionZones.push({
      zone: zoneRect,
      body: zoneBody,
      isActive: false,
      promptText,
      gameType,
    });
  }

  private createOverlapDetection(): void {
    if (!this.player) return;

    const playerBody = this.player.getBody();

    this.interactionZones.forEach((zoneData) => {
      this.physics.add.overlap(
        playerBody as any,
        zoneData.body,
        () => {
          if (!zoneData.isActive) {
            zoneData.isActive = true;
            // On desktop show the "Press E" text; on mobile the interact button handles this
            if (!this.isMobile) {
              zoneData.promptText.setVisible(true);
            }
            this.playerInZone = zoneData;
          }
        },
        undefined,
        this
      );
    });
  }

  private setupCamera(): void {
    if (!this.player) return;

    const playerContainer = this.player.getBody().gameObject;
    this.cameras.main.startFollow(playerContainer);
    this.cameras.main.setBounds(0, 0, this.roomWidth, this.roomHeight);
  }

  private setupInput(): void {
    this.isMobile = isMobileDevice();

    // Setup keyboard controls (desktop)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        E: Phaser.Input.Keyboard.KeyCodes.E,
      });

      // Listen for E key to interact with zones
      this.input.keyboard.on('keydown-E', () => {
        if (this.playerInZone) {
          this.game.events.emit('startGame', this.playerInZone.gameType);
        }
      });
    }

    // Setup mobile touch controls
    if (this.isMobile) {
      this.createVirtualJoystick();
      this.createInteractButton();
    }
  }

  private createVirtualJoystick(): void {
    const cam = this.cameras.main;
    const outerRadius = 60;
    const innerRadius = 28;
    const margin = 40;
    const baseX = margin + outerRadius;
    const baseY = cam.height - margin - outerRadius;

    this.joystickBase = { x: baseX, y: baseY };

    // Outer ring (the boundary)
    this.joystickOuter = this.add.circle(baseX, baseY, outerRadius, 0x000000, 0.3);
    this.joystickOuter.setStrokeStyle(2, 0xffd700, 0.6);
    this.joystickOuter.setScrollFactor(0);
    this.joystickOuter.setDepth(200);

    // Inner thumb (the draggable knob)
    this.joystickInner = this.add.circle(baseX, baseY, innerRadius, 0xffd700, 0.5);
    this.joystickInner.setScrollFactor(0);
    this.joystickInner.setDepth(201);

    // Handle touch input on the whole scene for joystick
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only claim this pointer if it's on the left half of the screen
      if (pointer.x < cam.width / 2 && !this.joystickActive) {
        this.joystickActive = true;
        this.joystickPointerId = pointer.id;
        this.updateJoystickPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer.id === this.joystickPointerId) {
        this.updateJoystickPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.resetJoystick();
      }
    });
  }

  private updateJoystickPosition(px: number, py: number): void {
    if (!this.joystickInner || !this.joystickOuter) return;

    const outerRadius = 60;
    const dx = px - this.joystickBase.x;
    const dy = py - this.joystickBase.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp the inner knob to within the outer ring
    let clampedX: number;
    let clampedY: number;
    if (dist > outerRadius) {
      clampedX = this.joystickBase.x + (dx / dist) * outerRadius;
      clampedY = this.joystickBase.y + (dy / dist) * outerRadius;
    } else {
      clampedX = px;
      clampedY = py;
    }

    this.joystickInner.setPosition(clampedX, clampedY);

    // Normalize the vector (-1 to 1 range)
    const normalizedDist = Math.min(dist, outerRadius) / outerRadius;
    // Apply a small deadzone to prevent drift
    if (normalizedDist < 0.15) {
      this.joystickVector = { x: 0, y: 0 };
    } else {
      this.joystickVector = {
        x: (dx / dist) * normalizedDist,
        y: (dy / dist) * normalizedDist,
      };
    }
  }

  private resetJoystick(): void {
    this.joystickActive = false;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
    if (this.joystickInner) {
      this.joystickInner.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
  }

  private createInteractButton(): void {
    const cam = this.cameras.main;
    const btnWidth = 120;
    const btnHeight = 54;
    const margin = 40;
    const btnX = cam.width - margin - btnWidth / 2;
    const btnY = cam.height - margin - btnHeight / 2;

    // Button background
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xffd700, 0.85);
    bg.setStrokeStyle(2, 0xffd700, 1);

    // Button label
    const label = this.add.text(0, 0, 'PLAY', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Container for the button
    this.interactButton = this.add.container(btnX, btnY, [bg, label]);
    this.interactButton.setScrollFactor(0);
    this.interactButton.setDepth(200);
    this.interactButton.setSize(btnWidth, btnHeight);
    this.interactButton.setInteractive();
    this.interactButton.setVisible(false); // Hidden until near a table
    this.interactButton.setAlpha(0);

    // Touch handlers with visual feedback
    this.interactButton.on('pointerdown', () => {
      bg.setFillStyle(0xccaa00, 1);
      this.interactButton?.setScale(0.95);
    });

    this.interactButton.on('pointerup', () => {
      bg.setFillStyle(0xffd700, 0.85);
      this.interactButton?.setScale(1);
      if (this.playerInZone) {
        this.game.events.emit('startGame', this.playerInZone.gameType);
      }
    });

    this.interactButton.on('pointerout', () => {
      bg.setFillStyle(0xffd700, 0.85);
      this.interactButton?.setScale(1);
    });
  }

  private createUI(): void {
    const chipCount = 1000; // Default chip count

    // Chip count display (top-right, fixed to camera)
    this.chipCountText = this.add.text(
      this.cameras.main.width - 20,
      20,
      `Chips: ${chipCount}`,
      {
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold',
      }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Instructions text (bottom, fixed to camera)
    // On mobile, the joystick + button replace the need for text instructions
    if (!this.isMobile) {
      this.instructionsText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.height - 30,
        'WASD / Arrows to move | E to interact',
        {
          fontSize: '14px',
          color: '#FFFFFF',
          align: 'center',
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    }
  }

  update(): void {
    if (!this.player) return;

    // Handle movement
    let vx = 0;
    let vy = 0;
    const speed = 150;

    if (this.isMobile) {
      // Mobile: use virtual joystick
      vx = this.joystickVector.x * speed;
      vy = this.joystickVector.y * speed;
    } else {
      // Desktop: keyboard input
      if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) {
        vx = -speed;
      }
      if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) {
        vx = speed;
      }
      if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) {
        vy = -speed;
      }
      if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) {
        vy = speed;
      }
    }

    this.player.setVelocity(vx, vy);

    // Update camera to follow player (with simple lerp)
    const playerPos = this.player.getPosition();
    const camera = this.cameras.main;
    const lerpFactor = 0.1;
    const targetX = playerPos.x - camera.width / 2;
    const targetY = playerPos.y - camera.height / 2;
    camera.scrollX += (targetX - camera.scrollX) * lerpFactor;
    camera.scrollY += (targetY - camera.scrollY) * lerpFactor;

    // Update interaction zones (check if player has left)
    this.interactionZones.forEach((zoneData) => {
      const zone = zoneData.zone;
      const zoneBounds = zone.getBounds() as Phaser.Geom.Rectangle;
      const playerPos = this.player!.getPosition();

      // Check if player is still overlapping with zone
      const playerX = playerPos.x;
      const playerY = playerPos.y;
      const playerSize = 24;
      const playerBounds = new Phaser.Geom.Rectangle(playerX - playerSize / 2, playerY - playerSize / 2, playerSize, playerSize);

      if (zoneBounds && !Phaser.Geom.Rectangle.Overlaps(zoneBounds, playerBounds)) {
        if (zoneData.isActive) {
          zoneData.isActive = false;
          zoneData.promptText.setVisible(false);
          if (this.playerInZone === zoneData) {
            this.playerInZone = null;
          }
        }
      }
    });

    // Show/hide the mobile interact button based on zone proximity
    if (this.isMobile && this.interactButton) {
      if (this.playerInZone) {
        if (!this.interactButton.visible) {
          this.interactButton.setVisible(true);
          this.tweens.add({
            targets: this.interactButton,
            alpha: 1,
            duration: 150,
            ease: 'Power2',
          });
        }
      } else {
        if (this.interactButton.visible && this.interactButton.alpha > 0) {
          this.tweens.add({
            targets: this.interactButton,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
              this.interactButton?.setVisible(false);
            },
          });
        }
      }
    }

    // Update nameplate position to follow avatar
    const currentPos = this.player.getPosition();
  }
}
