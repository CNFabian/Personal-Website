import * as Phaser from 'phaser';
import { SCENE_KEYS, COLORS, AuthUser, AUTH_STORAGE_KEYS } from '../common';

const API_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export class AuthScene extends Phaser.Scene {
  private isRegistering: boolean = false;
  private usernameInput: string = '';
  private passwordInput: string = '';
  private activeField: 'username' | 'password' = 'username';
  private statusText!: Phaser.GameObjects.Text;
  private usernameDisplayText!: Phaser.GameObjects.Text;
  private passwordDisplayText!: Phaser.GameObjects.Text;
  private usernameCursor!: Phaser.GameObjects.Text;
  private passwordCursor!: Phaser.GameObjects.Text;
  private usernameBox!: Phaser.GameObjects.Rectangle;
  private passwordBox!: Phaser.GameObjects.Rectangle;
  private toggleText!: Phaser.GameObjects.Text;
  private submitButtonText!: Phaser.GameObjects.Text;
  private passwordHintText!: Phaser.GameObjects.Text;
  private isLoading: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.AUTH });
  }

  create(): void {
    this.usernameInput = '';
    this.passwordInput = '';
    this.activeField = 'username';
    this.isRegistering = false;
    this.isLoading = false;

    this.createBackground();
    this.createTitle();
    this.createForm();
    this.createButtons();
    this.setupKeyboard();

    // Try auto-login
    this.tryAutoLogin();
  }

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

    this.add.text(centerX, 100, 'ONLINE PLAY', {
      fontSize: '48px',
      color: COLORS.GOLD,
      fontStyle: 'bold',
      stroke: COLORS.BLACK,
      strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(centerX, 155, 'Sign in to track your wins on the leaderboard', {
      fontSize: '18px',
      color: COLORS.WHITE,
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  private createForm(): void {
    const centerX = this.cameras.main.centerX;
    const formY = 220;

    // Form panel
    const panelWidth = 500;
    const panelHeight = 340;
    const panel = this.add.rectangle(centerX, formY + panelHeight / 2, panelWidth, panelHeight, 0x1a1a1a, 0.9);
    panel.setStrokeStyle(2, 0xffd700);

    // Toggle text (Login / Register)
    this.toggleText = this.add.text(centerX, formY + 25, 'LOGIN', {
      fontSize: '28px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Username label
    this.add.text(centerX - 180, formY + 65, 'USERNAME', {
      fontSize: '14px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'bold'
    });

    // Username input box
    this.usernameBox = this.add.rectangle(centerX, formY + 100, 380, 42, 0x333333);
    this.usernameBox.setStrokeStyle(2, 0xffd700);
    this.usernameBox.setInteractive();
    this.usernameBox.on('pointerdown', () => {
      this.activeField = 'username';
      this.updateFieldHighlights();
    });

    this.usernameDisplayText = this.add.text(centerX - 175, formY + 100, '', {
      fontSize: '20px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.usernameCursor = this.add.text(centerX - 175, formY + 100, '|', {
      fontSize: '20px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Password label
    this.add.text(centerX - 180, formY + 135, 'PASSWORD', {
      fontSize: '14px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'bold'
    });

    this.passwordHintText = this.add.text(centerX + 180, formY + 135, '(optional)', {
      fontSize: '12px',
      color: COLORS.LIGHT_GRAY,
      fontStyle: 'italic'
    }).setOrigin(1, 0);

    // Password input box
    this.passwordBox = this.add.rectangle(centerX, formY + 170, 380, 42, 0x333333);
    this.passwordBox.setStrokeStyle(2, 0x666666);
    this.passwordBox.setInteractive();
    this.passwordBox.on('pointerdown', () => {
      this.activeField = 'password';
      this.updateFieldHighlights();
    });

    this.passwordDisplayText = this.add.text(centerX - 175, formY + 170, '', {
      fontSize: '20px',
      color: COLORS.WHITE,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.passwordCursor = this.add.text(centerX - 175, formY + 170, '|', {
      fontSize: '20px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Blinking cursor
    this.time.addEvent({
      delay: 500,
      callback: () => {
        if (this.activeField === 'username') {
          this.usernameCursor.setVisible(!this.usernameCursor.visible);
          this.passwordCursor.setVisible(false);
        } else {
          this.passwordCursor.setVisible(!this.passwordCursor.visible);
          this.usernameCursor.setVisible(false);
        }
      },
      loop: true
    });

    // Status text (errors / success)
    this.statusText = this.add.text(centerX, formY + 215, '', {
      fontSize: '16px',
      color: COLORS.RED,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 380 }
    }).setOrigin(0.5);

    this.updateFieldHighlights();
  }

  private createButtons(): void {
    const centerX = this.cameras.main.centerX;
    const buttonY = 510;

    // Submit button
    const submitBtn = this.createButton(centerX, buttonY, 'LOGIN', () => this.handleSubmit());
    this.submitButtonText = submitBtn.getAt(1) as Phaser.GameObjects.Text;

    // Toggle Login/Register
    this.createSmallButton(centerX, buttonY + 55, "Don't have an account? Register", () => {
      this.isRegistering = !this.isRegistering;
      this.updateFormMode();
    });

    // Continue as Guest
    this.createButton(centerX, buttonY + 115, 'CONTINUE AS GUEST', () => {
      this.goToLobby(null);
    });

    // Back to menu
    this.createSmallButton(centerX, buttonY + 170, 'Back to Menu', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.MENU);
      });
    });
  }

  private updateFormMode(): void {
    if (this.isRegistering) {
      this.toggleText.setText('REGISTER');
      this.submitButtonText.setText('REGISTER');
      this.passwordHintText.setVisible(true);
    } else {
      this.toggleText.setText('LOGIN');
      this.submitButtonText.setText('LOGIN');
      this.passwordHintText.setVisible(true);
    }
    this.statusText.setText('');
  }

  private updateFieldHighlights(): void {
    if (this.activeField === 'username') {
      this.usernameBox.setStrokeStyle(2, 0xffd700);
      this.passwordBox.setStrokeStyle(2, 0x666666);
    } else {
      this.usernameBox.setStrokeStyle(2, 0x666666);
      this.passwordBox.setStrokeStyle(2, 0xffd700);
    }
  }

  private setupKeyboard(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (this.isLoading) return;

      if (event.key === 'Tab') {
        event.preventDefault();
        this.activeField = this.activeField === 'username' ? 'password' : 'username';
        this.updateFieldHighlights();
        return;
      }

      if (event.key === 'Enter') {
        this.handleSubmit();
        return;
      }

      if (event.key === 'Escape') {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENE_KEYS.MENU);
        });
        return;
      }

      if (event.key === 'Backspace') {
        if (this.activeField === 'username') {
          this.usernameInput = this.usernameInput.slice(0, -1);
        } else {
          this.passwordInput = this.passwordInput.slice(0, -1);
        }
        this.updateInputDisplay();
        return;
      }

      // Only allow printable characters
      if (event.key.length === 1) {
        if (this.activeField === 'username') {
          if (this.usernameInput.length < 20) {
            this.usernameInput += event.key;
          }
        } else {
          if (this.passwordInput.length < 50) {
            this.passwordInput += event.key;
          }
        }
        this.updateInputDisplay();
      }
    });
  }

  private updateInputDisplay(): void {
    this.usernameDisplayText.setText(this.usernameInput);
    this.passwordDisplayText.setText('•'.repeat(this.passwordInput.length));

    // Move cursors
    const uWidth = this.usernameDisplayText.width;
    this.usernameCursor.setX(this.usernameDisplayText.x + uWidth + 2);

    const pWidth = this.passwordDisplayText.width;
    this.passwordCursor.setX(this.passwordDisplayText.x + pWidth + 2);
  }

  private async handleSubmit(): Promise<void> {
    if (this.isLoading) return;

    const username = this.usernameInput.trim();
    if (!username) {
      this.statusText.setColor(COLORS.RED);
      this.statusText.setText('Please enter a username.');
      return;
    }

    this.isLoading = true;
    this.statusText.setColor(COLORS.LIGHT_GRAY);
    this.statusText.setText('Connecting...');

    const endpoint = this.isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body: any = { username };
    if (this.passwordInput.length > 0) {
      body.password = this.passwordInput;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        this.statusText.setColor(COLORS.RED);
        this.statusText.setText(data.error || 'Something went wrong.');
        this.isLoading = false;
        return;
      }

      // Success — store auth data
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.USERNAME, data.user.username);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER_ID, String(data.user.id));

      const authUser: AuthUser = {
        userId: data.user.id,
        username: data.user.username,
        token: data.token,
        wins: data.user.wins,
      };

      this.statusText.setColor(COLORS.GREEN);
      this.statusText.setText(`Welcome, ${data.user.username}!`);

      this.time.delayedCall(500, () => {
        this.goToLobby(authUser);
      });
    } catch (err) {
      this.statusText.setColor(COLORS.RED);
      this.statusText.setText('Cannot reach server. Is it running?');
      this.isLoading = false;
    }
  }

  private async tryAutoLogin(): Promise<void> {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
    const username = localStorage.getItem(AUTH_STORAGE_KEYS.USERNAME);

    if (!token || !username) return;

    this.statusText.setColor(COLORS.LIGHT_GRAY);
    this.statusText.setText('Signing in automatically...');

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const authUser: AuthUser = {
          userId: data.user.id,
          username: data.user.username,
          token,
          wins: data.user.wins,
        };

        this.statusText.setColor(COLORS.GREEN);
        this.statusText.setText(`Welcome back, ${data.user.username}!`);

        this.time.delayedCall(600, () => {
          this.goToLobby(authUser);
        });
      } else {
        // Token expired or invalid
        localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
        localStorage.removeItem(AUTH_STORAGE_KEYS.USERNAME);
        localStorage.removeItem(AUTH_STORAGE_KEYS.USER_ID);
        this.statusText.setText('');
      }
    } catch {
      // Server not reachable — just show the form
      this.statusText.setText('');
    }
  }

  private goToLobby(authUser: AuthUser | null): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.LOBBY, { authUser });
    });
  }

  // ---- Button helpers ----

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 320, 55, 0x8B4513);
    bg.setStrokeStyle(3, 0xffd700);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '22px',
      color: COLORS.GOLD,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(320, 55);
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

  private createSmallButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: COLORS.LIGHT_GRAY,
    }).setOrigin(0.5);

    button.add([buttonText]);
    button.setSize(400, 30);
    button.setInteractive();

    button.on('pointerover', () => {
      buttonText.setColor(COLORS.GOLD);
    });

    button.on('pointerout', () => {
      buttonText.setColor(COLORS.LIGHT_GRAY);
    });

    button.on('pointerup', () => {
      callback();
    });

    return button;
  }
}
