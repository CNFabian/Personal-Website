import React, { useState } from 'react';
import './Sololeveling.css';
import armyGif from '../assets/solo-leveling/army.gif'
import editGif from '../assets/solo-leveling/edit.gif'

const SoloLevelingCharacter = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="solo-leveling-character-container">
      {/* Show army GIF when not hovered (idle) */}
      {!isHovered && (
        <img 
          src={armyGif}
          alt="army-idle"
          className="army-animation"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
      
      {/* Show edit GIF when hovered (loops until hover ends) */}
      {isHovered && (
        <img 
          src={editGif}
          alt="edit-animation"
          className="edit-animation"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
};

export default SoloLevelingCharacter;