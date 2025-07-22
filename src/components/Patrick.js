import React, { useState } from 'react';
import './Patrick.css';
import idleGif from '../assets/patrick/Patrick.gif'
import hoverGif from '../assets/patrick/Patrick.gif'

const Patrick = () => {
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

export default Patrick;