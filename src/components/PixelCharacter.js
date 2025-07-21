import React, { useState, useEffect } from 'react';
import './PixelCharacter.css';

const PixelCharacter = ({ 
  initialGif = '/assets/zenitsu/lightning-landing.gif', 
  position = { x: 0, y: 0 },
  scale = 1,
  animations = {},
  isFooterCharacter = false
}) => {
  const [currentGif, setCurrentGif] = useState(initialGif);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(!isFooterCharacter);
  const [hasLanded, setHasLanded] = useState(false);


  // Function to change animation
  const playAnimation = (animationName, duration = 2000) => {
    if (animations[animationName] && !isAnimating) {
      setIsAnimating(true);
      setCurrentGif(animations[animationName]);
      
      setTimeout(() => {
        setCurrentGif(initialGif);
        setIsAnimating(false);
      }, duration);
    }
  };

  // Auto-play random animations occasionally (only when visible)
  useEffect(() => {
    if (!isVisible || isFooterCharacter) return;
    
    const animationKeys = Object.keys(animations);
    if (animationKeys.length === 0) return;

    const interval = setInterval(() => {
      if (!isAnimating && Math.random() < 0.3) {
        const randomAnimation = animationKeys[Math.floor(Math.random() * animationKeys.length)];
        playAnimation(randomAnimation);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [animations, isAnimating, isVisible, isFooterCharacter]);

  const handleClick = () => {
    const animationKeys = Object.keys(animations);
    if (animationKeys.length > 0) {
      const randomAnimation = animationKeys[Math.floor(Math.random() * animationKeys.length)];
      playAnimation(randomAnimation);
    }
  };

  const handleMouseEnter = () => {
    if (isFooterCharacter) {
        setIsVisible(true);
        // Play lighting_landing animation on first hover
        if (!hasLanded) {
        setTimeout(() => {
            if (animations.lighting_landing) {
            playAnimation('lighting_landing', 1500);
            setHasLanded(true);
            }
        }, 200);
        }
    }
    };

  const handleMouseLeave = () => {
    if (isFooterCharacter) {
      // Small delay before hiding to prevent flickering
      setTimeout(() => setIsVisible(false), 500);
    }
  };

  const characterStyle = isFooterCharacter ? {
    transform: `scale(${scale})`,
    position: 'relative'
  } : {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: `scale(${scale})`
  };

  return (
    <div 
      className={`pixel-character ${isFooterCharacter ? 'footer-character' : ''} ${isVisible ? 'visible' : ''}`}
      style={characterStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img 
        src={currentGif} 
        alt="Pixel Character" 
        className="pixel-gif"
        draggable={false}
      />
      
      {/* Interaction hint - only show for regular characters */}
      {!isFooterCharacter && (
        <div className="interaction-hint">
          Click me!
        </div>
      )}
    </div>
  );
};

export default PixelCharacter;