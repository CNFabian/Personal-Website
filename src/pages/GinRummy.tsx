import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Phaser from 'phaser';
import '../styles/pages/_gin-rummy.scss';

import { GinRummyPreloadScene } from '../phaser/scenes/gin-rummy-preload-scene';
import { GinRummyGameScene } from '../phaser/scenes/gin-rummy-game-scene';
import { COLORS, getGameDimensions } from '../phaser/common';

const GinRummy = () => {
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
      scene: [GinRummyPreloadScene, GinRummyGameScene],
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
    <div className="gin-rummy-page">
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

export default GinRummy;
