import React, { useState } from 'react';
import './BowserJr.css';
import idleGif from '../assets/bowserjr/idle.webp'
import hoverGif from '../assets/bowserjr/dance.gif'

const BowserJr = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="bowserjr-container">
      {!isHovered && (
        <img
          src={idleGif}
          alt="bowserjr-idle"
          className="bowserjr-idle"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}

      {isHovered && (
        <img
          src={hoverGif}
          alt="bowserjr-hover"
          className="bowserjr-hover"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
};

export default BowserJr;