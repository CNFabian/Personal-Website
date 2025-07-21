import React, { useState, useRef, useEffect } from 'react';
import AnimatedGif from './AnimatedGif';
import './PixelCharacter.css';
import lightning from '../assets/zenitsu/lightning-landing.gif'
import idleImage from '../assets/zenitsu/idle.png'
import stanceGif from '../assets/zenitsu/standing-to-stance.gif'
import largeChargeGif from '../assets/zenitsu/large-charge.gif'
import swordStrikeGif from '../assets/zenitsu/sword_strike.gif' // Add this import

const PixelCharacter = () => {
  const [showStance, setShowStance] = useState(false);
  const [showLargeCharge, setShowLargeCharge] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [showSwordStrike, setShowSwordStrike] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef(null);
  const idleTimeoutRef = useRef(null);

 // Auto sword strike during idle
useEffect(() => {
  if (!isPlaying && !isHovered && !showSwordStrike) {
    // Set random interval between 3-6 seconds for sword strike
    const randomDelay = Math.random() * 3000 + 3000; // 3-6 seconds
    
    idleTimeoutRef.current = setTimeout(() => {
      if (!isPlaying && !isHovered) {
        setShowSwordStrike(true);
        
        // Hide sword strike after animation completes (increase duration)
        setTimeout(() => {
          if (!isHovered) { // Only hide if not hovered
            setShowSwordStrike(false);
          }
        }, 2500); // Increased to 2.5 seconds - adjust based on your gif length
      }
    }, randomDelay);
  }

  return () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  };
}, [isPlaying, isHovered, showSwordStrike]);

const handleMouseEnter = () => {
  setIsHovered(true);
  
  // Clear idle timeout but let sword strike finish if it's playing
  if (idleTimeoutRef.current) {
    clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = null;
  }

  // If sword strike is currently playing, wait for it to finish
  if (showSwordStrike) {
    // Wait a bit for sword strike to finish, then start hover animation
    setTimeout(() => {
      setShowSwordStrike(false);
      startHoverAnimation();
    }, 500); // Adjust this delay as needed
  } else if (!isPlaying) {
    startHoverAnimation();
  }
};

// Helper function to start the hover animation sequence
const startHoverAnimation = () => {
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
    }, 10);
    
  }, 1600);
};

  const handleMouseLeave = () => {
    setIsHovered(false);
    
    // Immediately stop all animations and reset to idle
    setIsPlaying(false);
    setShowStance(false);
    setShowLargeCharge(false);
    setShowLightning(false);
    setShowSwordStrike(false);
    
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
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
      {!isPlaying && !showSwordStrike && (
        <img 
          src={idleImage}
          alt="idle-character"
          className="idle-image"
        />
      )}

      {/* Show sword strike GIF during idle periods */}
      {showSwordStrike && !isPlaying && (
        <img 
          src={swordStrikeGif}
          alt="sword-strike-animation"
          className="sword-strike-animation"
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