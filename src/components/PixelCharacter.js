import React, { useState } from 'react';
import AnimatedGif from './AnimatedGif';
import './PixelCharacter.css';
import lightning from '../assets/zenitsu/lightning-landing.gif'
import idleImage from '../assets/zenitsu/idle.png' // Add your idle PNG here

const PixelCharacter = () => {
  const [showLightning, setShowLightning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleMouseEnter = () => {
    if (!isPlaying) {
      setShowLightning(true);
      setIsPlaying(true);
      
      setTimeout(() => {
        setShowLightning(false);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    setIsPlaying(false);
  };

 return (
  <div 
    className="pixel-character-container"
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    style={{ width: '100%', height: '100%' }}
  >
    {/* Always show idle PNG */}
    {!showLightning && (
      <img 
        src={idleImage}
        alt="idle-character"
        className="idle-image"
      />
    )}
    
    {/* Show lightning GIF on hover */}
    {showLightning && (
      <img 
        src={lightning}
        alt="lightning-landing"
        className="lightning-animation"
      />
    )}
  </div>
);
};

export default PixelCharacter;