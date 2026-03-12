import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import '../styles/pages/_casino.scss';
import { CasinoPreloadScene } from '../phaser/scenes/casino-preload-scene';
import { CasinoLobbyScene } from '../phaser/scenes/casino-lobby-scene';
import AvatarCreator from '../components/AvatarCreator';
import type { AvatarData } from '../phaser/avatar/AvatarRenderer';
import { COLORS, getGameDimensions } from '../phaser/common';

const API_URL = process.env.REACT_APP_API_URL || 'https://ws.cnfabian.com';

interface UserProfile {
  id: number;
  username: string;
  avatar_data: AvatarData | null;
}

const Casino = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'avatar' | 'lobby'>('loading');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('ratscrew_auth_token');

      if (!token) {
        setAuthState('auth');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          localStorage.removeItem('ratscrew_auth_token');
          localStorage.removeItem('ratscrew_username');
          localStorage.removeItem('ratscrew_user_id');
          setAuthState('auth');
          return;
        }

        const data = await response.json();
        if (data.success && data.user) {
          setUserProfile(data.user);
          if (data.user.avatar_data) {
            setAuthState('lobby');
            setShowNavbar(false);
          } else {
            setAuthState('avatar');
          }
        } else {
          setAuthState('auth');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthState('auth');
      }
    };

    checkAuth();
  }, []);

  // Handle authentication form submission
  const handleAuthSubmit = async (username: string, password: string, isRegistering: boolean) => {
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body: any = { username };
    if (password.length > 0) {
      body.password = password;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('ratscrew_auth_token', data.token);
      localStorage.setItem('ratscrew_username', data.user.username);
      localStorage.setItem('ratscrew_user_id', String(data.user.id));

      setUserProfile(data.user);
      setAuthState('avatar');
    } catch (err) {
      console.error('Auth error:', err);
      alert('Cannot reach server. Is it running?');
    }
  };

  // Handle avatar save
  const handleAvatarSave = async (avatarData: AvatarData) => {
    const token = localStorage.getItem('ratscrew_auth_token');
    if (!token) {
      setAuthState('auth');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(avatarData),
      });

      if (!response.ok) {
        alert('Failed to save avatar');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUserProfile((prev) =>
          prev ? { ...prev, avatar_data: avatarData } : null
        );
        setAuthState('lobby');
        setShowNavbar(false);
      }
    } catch (err) {
      console.error('Avatar save error:', err);
      alert('Error saving avatar');
    }
  };

  // Initialize Phaser game
  useEffect(() => {
    if (authState !== 'lobby' || !userProfile || !gameContainerRef.current || gameInstanceRef.current) {
      return;
    }

    const dims = getGameDimensions();

    const config = {
      type: Phaser.AUTO,
      width: dims.width,
      height: dims.height,
      parent: gameContainerRef.current,
      backgroundColor: COLORS.BACKGROUND,
      scene: [CasinoPreloadScene, CasinoLobbyScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        keyboard: true,
        mouse: true,
        touch: true,
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true,
      },
      disableContextMenu: true,
    };

    gameInstanceRef.current = new Phaser.Game(config);

    // Register game data
    gameInstanceRef.current.registry.set('avatarData', userProfile.avatar_data);
    gameInstanceRef.current.registry.set('username', userProfile.username);
    gameInstanceRef.current.registry.set('userId', userProfile.id);

    // Listen for game events
    gameInstanceRef.current.events.on('startGame', (gameType: string) => {
      if (gameType === 'ratscrew') {
        window.location.href = '/egyptian-ratscrew';
      }
    });

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [authState, userProfile]);

  // Render auth form
  if (authState === 'auth') {
    return (
      <div className="casino-page casino-auth">
        <div className="casino-auth-container">
          <h1 className="casino-title">CASINO LOBBY</h1>
          <p className="casino-subtitle">Sign in to enter the casino</p>
          <AuthForm onSubmit={handleAuthSubmit} />
        </div>
      </div>
    );
  }

  // Render avatar creator
  if (authState === 'avatar' && userProfile) {
    return (
      <div className="casino-page casino-avatar">
        <AvatarCreator
          onSave={handleAvatarSave}
          initialData={userProfile.avatar_data}
        />
      </div>
    );
  }

  // Render game
  if (authState === 'lobby') {
    return (
      <div className="casino-page">
        <div ref={gameContainerRef} className="phaser-game-container" />
      </div>
    );
  }

  // Loading state
  return (
    <div className="casino-page casino-loading">
      <div className="loading-spinner">Loading casino...</div>
    </div>
  );
};

interface AuthFormProps {
  onSubmit: (username: string, password: string, isRegistering: boolean) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }
    setIsLoading(true);
    await onSubmit(username, password, isRegistering);
    setIsLoading(false);
  };

  return (
    <div className="casino-auth-form">
      <div className="casino-form-title">
        {isRegistering ? 'REGISTER' : 'LOGIN'}
      </div>

      <div className="casino-form-group">
        <label htmlFor="casino-username">USERNAME</label>
        <input
          id="casino-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter username"
          disabled={isLoading}
          maxLength={20}
        />
      </div>

      <div className="casino-form-group">
        <label htmlFor="casino-password">
          PASSWORD <span className="optional">(optional)</span>
        </label>
        <input
          id="casino-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter password (optional)"
          disabled={isLoading}
          maxLength={50}
        />
      </div>

      <button
        className="casino-submit-button"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : isRegistering ? 'REGISTER' : 'LOGIN'}
      </button>

      <button
        className="casino-toggle-button"
        onClick={() => {
          setIsRegistering(!isRegistering);
          setPassword('');
        }}
        disabled={isLoading}
      >
        {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
      </button>

      <button
        className="casino-guest-button"
        onClick={() => onSubmit('Guest_' + Date.now(), '', true)}
        disabled={isLoading}
      >
        CONTINUE AS GUEST
      </button>
    </div>
  );
};

export default Casino;
