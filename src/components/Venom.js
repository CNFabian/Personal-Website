import React, { useState } from 'react';
import './Venom.css';
import idleGif from '../assets/venom/Venom.gif'
import hoverGif from '../assets/venom/Venom.gif'

const Venom = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="venpm-container">
      {!isHovered && (
        <img 
          src={idleGif}
          alt="character-idle"
          className="venom-idle"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
      
      {isHovered && (
        <img
          src={hoverGif}
          alt="character-hover"
          className="venom-hover"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
};

export default Venom;