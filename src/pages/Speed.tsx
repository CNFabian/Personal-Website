import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Phaser from 'phaser';
import '../styles/pages/_speed.scss';

import { SpeedPreloadScene } from '../phaser/scenes/speed-preload-scene';
import { SpeedMenuScene } from '../phaser/scenes/speed-menu-scene';
import { AuthScene } from '../phaser/scenes/auth-scene';
import { SpeedLobbyScene } from '../phaser/scenes/speed-lobby-scene';
import { SpeedGameScene } from '../phaser/scenes/speed-game-scene';
import { COLORS, getGameDimensions } from '../phaser/common';

const Speed = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameContainerRef.current || gameInstanceRef.current) return;

    const dims = getGameDimensions();

    const config = {
      type: Phaser.AUTO,
      width: dims.width,
      height: dims.height,
      parent: gameContainerRef.current,
      backgroundColor: COLORS.BACKGROUND,
      scene: [SpeedPreloadScene, SpeedMenuScene, AuthScene, SpeedLobbyScene, SpeedGameScene],
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
      dom: {
        createContainer: true,
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

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="speed-page">
      <button
        className="exit-button"
        onClick={() => navigate('/casino')}
        title="Back to Casino"
      >
        &larr; Exit
      </button>
      <div ref={gameContainerRef} className="phaser-game-container" />
    </div>
  );
};

export default Speed;
