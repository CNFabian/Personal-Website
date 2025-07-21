import React, { useState, useRef } from 'react';
import AnimatedGif from './AnimatedGif';
import './PixelCharacter.css';
import lightning from '../assets/zenitsu/lightning-landing.gif'
import idleImage from '../assets/zenitsu/idle.png'
import stanceGif from '../assets/zenitsu/standing-to-stance.gif'
import largeChargeGif from '../assets/zenitsu/large-charge.gif'

const PixelCharacter = () => {
  const [showStance, setShowStance] = useState(false);
  const [showLargeCharge, setShowLargeCharge] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef(null);
const handleMouseEnter = () => {
  if (!isPlaying) {
    setIsPlaying(true);
    
    // Start the stance animation immediately
    setShowStance(true);
    
    // After stance animation completes, start lightning first
    timeoutRef.current = setTimeout(() => {
      setShowStance(false);
      setShowLightning(true);
      
      // Then start large-charge after a few milliseconds
      setTimeout(() => {
        setShowLargeCharge(true);
      }, 10); // Adjust this delay as needed (300ms = few milliseconds)
      
    }, 1600);
  }
};

  const handleMouseLeave = () => {
    // Immediately stop all animations and reset to idle
    setIsPlaying(false);
    setShowStance(false);
    setShowLargeCharge(false);
    setShowLightning(false);
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <div 
      className="pixel-character-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Show idle PNG when not animating */}
      {!isPlaying && (
        <img 
          src={idleImage}
          alt="idle-character"
          className="idle-image"
        />
      )}
      
      {/* Show stance GIF first */}
      {showStance && (
        <img 
          src={stanceGif}
          alt="stance-animation"
          className="stance-animation"
        />
      )}
      
      {/* Show large-charge GIF as base layer (loops until hover ends) */}
      {showLargeCharge && (
        <img 
          src={largeChargeGif}
          alt="large-charge-animation"
          className="large-charge-animation"
        />
      )}
      
      {/* Show lightning GIF as overlay */}
      {showLightning && (
        <img 
          src={lightning}
          alt="lightning-landing"
          className="lightning-animation-overlay"
        />
      )}
    </div>
  );
};

export default PixelCharacter;