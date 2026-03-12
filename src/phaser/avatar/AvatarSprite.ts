import * as Phaser from 'phaser';
import { AvatarRenderer, AvatarData } from './AvatarRenderer';

/**
 * AvatarSprite - A higher-level class that wraps AvatarRenderer with movement/animation logic
 * Manages a physics-enabled avatar in the lobby with a nameplate
 */
export class AvatarSprite {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private renderer: AvatarRenderer;
  private nameText: Phaser.GameObjects.Text;
  private speed: number = 150;
  private physicsBody!: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    avatarData: AvatarData,
    username: string
  ) {
    this.scene = scene;

    // Create the avatar renderer
    this.renderer = new AvatarRenderer(scene, avatarData);
    this.container = this.renderer.create(x, y);

    // Set depth so avatars render above floor tiles
    this.container.setDepth(10);

    // Enable physics on the container
    this.scene.physics.add.existing(this.container);
    this.physicsBody = this.container.body as Phaser.Physics.Arcade.Body;

    // Set a physics body size of 24x24 (smaller than visual for better collision feel)
    this.physicsBody.setSize(24, 24);

    // Add nameplate text above the avatar
    this.nameText = this.scene.add.text(x, y - 32, username, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    });
    this.nameText.setOrigin(0.5, 1);
    this.nameText.setDepth(11);

    // Initially hidden, can be toggled
    this.nameText.setVisible(true);
  }

  /**
   * Sets the velocity of the avatar
   * The physics body will handle movement automatically
   */
  setVelocity(vx: number, vy: number): void {
    this.physicsBody.setVelocity(vx, vy);
  }

  /**
   * Returns the current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y };
  }

  /**
   * Sets the position directly
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.nameText.setPosition(x, y - 32);
  }

  /**
   * Returns the physics body for collisions and movement
   */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }

  /**
   * Toggles visibility of the nameplate
   */
  setNameVisible(visible: boolean): void {
    this.nameText.setVisible(visible);
  }

  /**
   * Updates the avatar's visual appearance
   */
  updateAvatar(avatarData: AvatarData): void {
    this.renderer.update(avatarData);
  }

  /**
   * Cleans up the avatar sprite and all associated objects
   */
  destroy(): void {
    this.renderer.destroy();
    this.nameText.destroy();
    this.container.destroy();
  }
}
