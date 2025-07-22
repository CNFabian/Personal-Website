import React, { useState } from 'react';
import './BowserJr.css';
import idleGif from '../assets/bowserjr/idle.webp'
import hoverGif from '../assets/bowserjr/dance.gif'

const NewCharacter = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="new-character-container">
      {!isHovered && (
        <img 
          src={idleGif}
          alt="character-idle"
          className="new-character-idle"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
      
      {isHovered && (
        <img 
          src={hoverGif}
          alt="character-hover"
          className="new-character-hover"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
};

export default NewCharacter;