import React, { useState } from 'react';
import AnimatedGif from './AnimatedGif';
import './PixelCharacter.css';
import lightning from '../assets/zenitsu/lightning-landing.gif'

const PixelCharacter = () => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const handleMouseEnter = () => {
    console.log("Mouse entered - hasPlayed:", hasPlayed);
    if (!hasPlayed) {
      console.log("Playing lightning landing animation");
      setShowAnimation(true);
      setHasPlayed(true);
    }
  };

  return (
    <div 
      className="pixel-character-container"
      onMouseEnter={handleMouseEnter}
    >
      {showAnimation && (
       <AnimatedGif 
       src= {lightning}
       alt="lighting-landing"
        />
      )}
    </div>
  );
};

export default PixelCharacter;