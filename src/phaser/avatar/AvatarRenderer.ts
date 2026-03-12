import * as Phaser from 'phaser';

/**
 * Avatar data interface - must match the React AvatarCreator component
 */
export interface AvatarData {
  body: number;
  skinColor: string;
  hair: number;
  hairColor: string;
  eyes: number;
  top: number;
  topColor: string;
  bottom: number;
  bottomColor: string;
  hat: number;
  hatColor: string;
}

/**
 * AvatarRenderer - Renders a composite avatar in Phaser using Graphics objects
 * Matches the visual style of the React AvatarCreator canvas drawing
 * Scaled for a top-down lobby view (approximately 32x48 pixels)
 */
export class AvatarRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private avatarData: AvatarData;

  constructor(scene: Phaser.Scene, avatarData: AvatarData) {
    this.scene = scene;
    this.avatarData = avatarData;
    this.container = this.scene.add.container(0, 0);
    this.graphics = this.scene.add.graphics();
    this.container.add(this.graphics);
  }

  /**
   * Creates and returns the avatar container at the given position
   */
  create(x: number, y: number): Phaser.GameObjects.Container {
    this.container.setPosition(x, y);
    this.drawAvatar();
    return this.container;
  }

  /**
   * Redraws the avatar with new data
   */
  update(avatarData: AvatarData): void {
    this.avatarData = avatarData;
    this.graphics.clear();
    this.drawAvatar();
  }

  /**
   * Returns the container holding the avatar
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Cleans up the avatar
   */
  destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }

  /**
   * Internal method to draw the avatar using Phaser Graphics
   * Scaled down from the canvas version (200x300 -> 32x48)
   * Scale factor: 0.16
   */
  private drawAvatar(): void {
    const g = this.graphics;

    // Scale factor to fit avatar into small lobby size
    const scale = 0.16;

    // Center coordinates (relative to container)
    const centerX = 16; // 32 width / 2
    const centerY = 24; // 48 height / 2

    // --- 1. Draw Body (head + torso) ---
    g.fillStyle(this.hexToInt(this.avatarData.skinColor), 1);

    // Head (circle at upper area)
    const headRadius = 35 * scale;
    g.fillCircleShape(
      new Phaser.Geom.Circle(centerX, centerY - 60 * scale, headRadius)
    );

    // Torso (rounded rectangle-ish shape)
    // Using multiple circles and rectangles to approximate the canvas path
    const torsoWidth = 60 * scale;
    const torsoHeight = 65 * scale;
    const torsoX = centerX;
    const torsoY = centerY - 25 * scale;

    // Main torso rectangle
    g.fillRectShape(
      new Phaser.Geom.Rectangle(
        torsoX - torsoWidth / 2,
        torsoY,
        torsoWidth,
        torsoHeight
      )
    );

    // Rounded edges on sides (using circles)
    g.fillCircleShape(new Phaser.Geom.Circle(torsoX - torsoWidth / 2, centerY, 8 * scale));
    g.fillCircleShape(new Phaser.Geom.Circle(torsoX + torsoWidth / 2, centerY, 8 * scale));

    // --- 2. Draw Bottom clothing ---
    g.fillStyle(this.hexToInt(this.avatarData.bottomColor), 1);
    const bottomY = centerY + 38 * scale;
    const bottomHeight = 45 * scale;
    g.fillRectShape(
      new Phaser.Geom.Rectangle(
        centerX - 32 * scale,
        bottomY,
        64 * scale,
        bottomHeight
      )
    );

    // Bottom clothing details
    if (this.avatarData.bottom === 1) {
      // Striped pattern
      g.fillStyle(0x000000, 0.1);
      for (let i = 0; i < 5; i++) {
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 32 * scale + i * 16 * scale,
            bottomY,
            8 * scale,
            bottomHeight
          )
        );
      }
    } else if (this.avatarData.bottom === 2) {
      // Pockets
      g.fillStyle(0x000000, 0.1);
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX - 20 * scale,
          centerY + 50 * scale,
          12 * scale,
          15 * scale
        )
      );
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX + 8 * scale,
          centerY + 50 * scale,
          12 * scale,
          15 * scale
        )
      );
    }

    // --- 3. Draw Top clothing ---
    g.fillStyle(this.hexToInt(this.avatarData.topColor), 1);
    const topY = centerY - 20 * scale;
    const topHeight = 38 * scale;
    g.fillRectShape(
      new Phaser.Geom.Rectangle(
        centerX - 32 * scale,
        topY,
        64 * scale,
        topHeight
      )
    );

    // Top clothing details
    if (this.avatarData.top === 1) {
      // Striped pattern
      g.fillStyle(0xffffff, 0.15);
      for (let i = 0; i < 4; i++) {
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 32 * scale + i * 16 * scale,
            topY,
            8 * scale,
            topHeight
          )
        );
      }
    } else if (this.avatarData.top === 2) {
      // Buttons
      g.fillStyle(0x000000, 0.3);
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, centerY - 5 * scale, 3 * scale));
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, centerY + 8 * scale, 3 * scale));
    } else if (this.avatarData.top === 3) {
      // Polka dots
      g.fillStyle(0x000000, 0.2);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          g.fillCircleShape(
            new Phaser.Geom.Circle(
              centerX - 20 * scale + i * 15 * scale,
              centerY - 10 * scale + j * 15 * scale,
              3 * scale
            )
          );
        }
      }
    }

    // --- 4. Draw Hair ---
    g.fillStyle(this.hexToInt(this.avatarData.hairColor), 1);
    const hairY = centerY - 95 * scale;

    if (this.avatarData.hair === 0) {
      // Short hair - circle + rectangle
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 38 * scale));
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX - 38 * scale,
          hairY + 10 * scale,
          76 * scale,
          30 * scale
        )
      );
    } else if (this.avatarData.hair === 1) {
      // Long hair
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 40 * scale));
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX - 42 * scale,
          hairY - 5 * scale,
          84 * scale,
          80 * scale
        )
      );
    } else if (this.avatarData.hair === 2) {
      // Curly/afro
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 45 * scale));
      // Add texture circles
      g.fillStyle(0x000000, 0.15);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * 40 * scale;
        const y = hairY + 35 * scale + Math.sin(angle) * 40 * scale;
        g.fillCircleShape(new Phaser.Geom.Circle(x, y, 6 * scale));
      }
    } else if (this.avatarData.hair === 3) {
      // Spiky hair
      g.fillStyle(this.hexToInt(this.avatarData.hairColor), 1);
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 35 * scale));
      // Spikes
      g.lineStyle(2, this.hexToInt(this.avatarData.hairColor), 1);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spikeX = centerX + Math.cos(angle) * 35 * scale;
        const spikeY = hairY + 35 * scale + Math.sin(angle) * 35 * scale;
        const tipX = centerX + Math.cos(angle) * 55 * scale;
        const tipY = hairY + 35 * scale + Math.sin(angle) * 55 * scale;
        g.strokeLineShape(
          new Phaser.Geom.Line(spikeX, spikeY, tipX, tipY)
        );
      }
    } else if (this.avatarData.hair === 4) {
      // Side part
      g.fillCircleShape(new Phaser.Geom.Circle(centerX - 5 * scale, hairY + 35 * scale, 40 * scale));
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX - 40 * scale,
          hairY - 5 * scale,
          75 * scale,
          50 * scale
        )
      );
    } else if (this.avatarData.hair === 5) {
      // Ponytail
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 35 * scale));
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX + 20 * scale,
          hairY + 40 * scale,
          15 * scale,
          50 * scale
        )
      );
    } else if (this.avatarData.hair === 6) {
      // Twin buns
      g.fillCircleShape(new Phaser.Geom.Circle(centerX - 20 * scale, hairY + 25 * scale, 18 * scale));
      g.fillCircleShape(new Phaser.Geom.Circle(centerX + 20 * scale, hairY + 25 * scale, 18 * scale));
      g.fillRectShape(
        new Phaser.Geom.Rectangle(
          centerX - 35 * scale,
          hairY + 35 * scale,
          70 * scale,
          25 * scale
        )
      );
    } else if (this.avatarData.hair === 7) {
      // Bald/minimal
      g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 35 * scale, 32 * scale));
    }

    // --- 5. Draw Hat (if selected) ---
    if (this.avatarData.hat >= 0) {
      g.fillStyle(this.hexToInt(this.avatarData.hatColor), 1);

      if (this.avatarData.hat === 0) {
        // Top hat
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 20 * scale,
            hairY - 30 * scale,
            40 * scale,
            15 * scale
          )
        );
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 28 * scale,
            hairY - 10 * scale,
            56 * scale,
            8 * scale
          )
        );
      } else if (this.avatarData.hat === 1) {
        // Cowboy hat
        g.fillEllipseShape(
          new Phaser.Geom.Ellipse(centerX, hairY + 8 * scale, 50 * scale, 15 * scale)
        );
        g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY - 5 * scale, 20 * scale));
      } else if (this.avatarData.hat === 2) {
        // Beanie
        g.fillCircleShape(new Phaser.Geom.Circle(centerX, hairY + 10 * scale, 32 * scale));
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 32 * scale,
            hairY + 10 * scale,
            64 * scale,
            8 * scale
          )
        );
      } else if (this.avatarData.hat === 3) {
        // Crown
        g.fillRectShape(
          new Phaser.Geom.Rectangle(
            centerX - 30 * scale,
            hairY + 10 * scale,
            60 * scale,
            8 * scale
          )
        );
        // Spikes
        for (let i = 0; i < 5; i++) {
          g.fillCircleShape(
            new Phaser.Geom.Circle(
              centerX - 25 * scale + i * 12.5 * scale,
              hairY + 8 * scale,
              4 * scale
            )
          );
        }
      }
    }

    // --- 6. Draw Eyes ---
    g.fillStyle(0xffffff, 1);
    const eyeY = centerY - 70 * scale;

    if (this.avatarData.eyes === 0) {
      // Classic round eyes
      g.fillCircleShape(new Phaser.Geom.Circle(centerX - 12 * scale, eyeY, 6 * scale));
      g.fillCircleShape(new Phaser.Geom.Circle(centerX + 12 * scale, eyeY, 6 * scale));
      // Pupils
      g.fillStyle(0x000000, 1);
      g.fillCircleShape(new Phaser.Geom.Circle(centerX - 12 * scale, eyeY, 3 * scale));
      g.fillCircleShape(new Phaser.Geom.Circle(centerX + 12 * scale, eyeY, 3 * scale));
    } else if (this.avatarData.eyes === 1) {
      // Happy/crescent eyes
      g.lineStyle(2, 0x000000, 1);
      g.strokeCircleShape(new Phaser.Geom.Circle(centerX - 12 * scale, eyeY, 6 * scale));
      g.strokeCircleShape(new Phaser.Geom.Circle(centerX + 12 * scale, eyeY, 6 * scale));
    } else if (this.avatarData.eyes === 2) {
      // Angry eyes
      g.lineStyle(2, 0x000000, 1);
      g.strokeLineShape(
        new Phaser.Geom.Line(
          centerX - 18 * scale,
          eyeY - 4 * scale,
          centerX - 6 * scale,
          eyeY + 4 * scale
        )
      );
      g.strokeLineShape(
        new Phaser.Geom.Line(
          centerX + 6 * scale,
          eyeY - 4 * scale,
          centerX + 18 * scale,
          eyeY + 4 * scale
        )
      );
    } else if (this.avatarData.eyes === 3) {
      // Star eyes
      const starSize = 5 * scale;
      this.drawStar(centerX - 12 * scale, eyeY, starSize, 0xffd700);
      this.drawStar(centerX + 12 * scale, eyeY, starSize, 0xffd700);
    }
  }

  /**
   * Helper to draw a star shape
   */
  private drawStar(
    x: number,
    y: number,
    size: number,
    color: number
  ): void {
    const g = this.graphics;
    const points = 5;
    const outerRadius = size;
    const innerRadius = size / 2;

    g.fillStyle(color, 1);
    g.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      if (i === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }

    g.closePath();
    g.fillPath();
  }

  /**
   * Helper to convert hex color string to integer
   */
  private hexToInt(hex: string): number {
    return parseInt(hex.replace('#', '0x'), 16);
  }
}
