import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import '../styles/pages/_egyptian-ratscrew.scss';

// Import your Phaser scenes (you'll need to make sure these are accessible)
// You may need to adjust the import paths based on your project structure
import { PreloadScene } from '../phaser/scenes/preload-scene';
import { MenuScene } from '../phaser/scenes/menu-scene';
import { AuthScene } from '../phaser/scenes/auth-scene';
import { RulesScene } from '../phaser/scenes/rules-scene';
import { LobbyScene } from '../phaser/scenes/lobby-scene';
import { GameScene } from '../phaser/scenes/game-scene';
import { COLORS, getGameDimensions } from '../phaser/common';

const EgyptianRatscrew = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current || gameInstanceRef.current) return;

    const dims = getGameDimensions();

    const config = {
      type: Phaser.AUTO,
      width: dims.width,
      height: dims.height,
      parent: gameContainerRef.current,
      backgroundColor: COLORS.BACKGROUND,
      scene: [PreloadScene, MenuScene, AuthScene, RulesScene, LobbyScene, GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
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
        touch: true
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: true
      },
      disableContextMenu: true
    };

    gameInstanceRef.current = new Phaser.Game(config);

    // Cleanup function
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="egyptian-ratscrew-page">
      <div className="game-header">
        <h1>Egyptian Ratscrew</h1>
        <p>A fast-paced card slapping game!</p>
      </div>
      <div className="game-container-wrapper">
        <div ref={gameContainerRef} className="phaser-game-container" />
      </div>
      <div className="game-instructions">
        <h2>How to Play</h2>
        <ul>
          <li><strong>Space</strong> - Play a card</li>
          <li><strong>S Key</strong> - Slap the pile</li>
          <li>Watch for matching cards and special patterns!</li>
        </ul>
      </div>
    </div>
  );
};

export default EgyptianRatscrew;