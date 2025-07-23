import React, { useState, useEffect, useRef } from "react";
import "./About.scss";
import beachPhoto from '../assets/beach.png';
import scenicPhoto from '../assets/scenic_view.png';
import familyPhoto from '../assets/family.png';
import drawingPhoto from '../assets/drawing.png';
import chowPhoto from '../assets/chow.png';
import momPhoto from '../assets/mom.png';


const About = () => {
  // Enhanced tooltip state with more properties
  const [tooltip, setTooltip] = useState({
    text: "",
    title: "",
    visible: false,
    position: { top: 0, left: 0 },
    direction: "right", // Changed to right/left instead of top/bottom
    category: "",
    icon: "📷",
  });

  // Keep track of which image is being hovered
  const [hoveredImage, setHoveredImage] = useState(null);
  
  // Reference for tooltip element to apply animations
  const tooltipRef = useRef(null);
  
  // Define image categories and their data
  const imageData = {
    "Me and My Cat": {
      title: "My Cat & Me",
      description: "Hanging out with my first cat pet Chow",
      category: "personal",
      icon: "🐱"
    },
    "Family fishing trip": {
      title: "Family Trip",
      description: "All men fishing trip with the family, sadly we didn't catch any fish ",
      category: "family",
      icon: "🎣"
    },
    "Scenic View": {
      title: "Hiking in Yosemite",
      description: "A friends trip to Yosemite's Mist Trail, defineitly one for the books!",
      category: "hobby",
      icon: "🥾⛰️"
    },
    "My artwork": {
      title: "Artwork",
      description: "Pencil drawing I created last summer",
      category: "hobby",
      icon: "🎨"
    }
  };

  // Handle mouse enter event for images with inside tooltip positioning
  const handleImageMouseEnter = (event, alt) => {
    const rect = event.target.getBoundingClientRect();
    
    // Check if image is on left or right side of page
    const isLeftSide = event.target.className.includes("left");
    const isRightSide = event.target.className.includes("right");
    
    // Tooltips always point toward center (inside edge)
    const direction = isLeftSide ? "right" : "left";
    
    const imageInfo = imageData[alt] || { 
      title: alt,
      description: "Image description",
      category: "photo",
      icon: "📷"
    };
    
    // Update which image is being hovered
    setHoveredImage(event.target);
    
    // Set tooltip position based on which side the image is on
    let position;
    if (isLeftSide) {
      // For left-side images, position tooltip to the right of the image
      position = {
        left: rect.right + 15,
        top: rect.top + (rect.height / 2) + window.scrollY
      };
    } else {
      // For right-side images, position tooltip to the left of the image
      position = {
        left: rect.left - 15,
        top: rect.top + (rect.height / 2) + window.scrollY
      };
    }
    
    // Set tooltip data
    setTooltip({
      text: imageInfo.description,
      title: imageInfo.title,
      category: imageInfo.category,
      icon: imageInfo.icon,
      visible: true,
      direction: direction,
      position: position
    });
  };

  // Handle mouse leave event for images
  const handleImageMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
    setHoveredImage(null);
  };

  return (
    <div className="about-page">
      {/* Enhanced Inside Tooltip */}
      {tooltip.visible && (
        <div 
          ref={tooltipRef}
          className={`image-tooltip ${tooltip.direction}`}
          style={{
            position: 'absolute',
            top: `${tooltip.position.top - 30}px`, // Center vertically
            left: tooltip.direction === 'right' ? 
              `${tooltip.position.left}px` : 
              `${tooltip.position.left - 220}px`, // Adjust based on direction and width
            zIndex: 1000,
          }}
        >
          <div className="tooltip-content">
            <span className="tooltip-icon">{tooltip.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{tooltip.title}</div>
              <div className="tooltip-text">{tooltip.text}</div>
            </div>
          </div>
          
          {/* Arrow pointing to the image */}
          <div className={`tooltip-arrow ${tooltip.direction}`}></div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-about">
        <div className="hero-content-about">
          <h1>About Me</h1>
          <p>Hey there! I'm Christopher Fabian, someone w
            <span className="underlined-span">h</span>
            o appreciates creativity, learning, 
            and personal growth. I love connecting with people, exploring new ideas, and finding 
            joy in the little things that make life exciting.</p>
        </div>
      </section>

      {/* Personal Life Section */}
      <section className="personal-life">
        <img 
          src={scenicPhoto} 
          className={`edge-image top-left ${hoveredImage && hoveredImage.alt === "Scenic View" ? "pulse" : ""}`}
          onMouseEnter={(e) => handleImageMouseEnter(e, "Scenic View")}
          onMouseLeave={handleImageMouseLeave}
        />
        <img 
          src={familyPhoto} 
          className={`edge-image bottom-right ${hoveredImage && hoveredImage.alt === "Family fishing trip" ? "pulse" : ""}`}
          onMouseEnter={(e) => handleImageMouseEnter(e, "Family fishing trip")}
          onMouseLeave={handleImageMouseLeave}
        />
        <div className="content">
          <h2>Who I Am</h2>
          <p>I'm a person who values insightful log
          <span className="underlined-span">i</span>
            c, conscious decision-making, and honest feedback. 
            My journey has been shaped by my experiences as a first-generation college graduate, 
            and I believe those experiences have taught me to be more conscious of how I navigate the world.</p>
          <p>When I'm not working on projects or co
          <span className="underlined-span">d</span>
            ing, I enjoy spending time with family, 
            reading books, drawing, or watching a good TV series. I enjoy and find relief in simple moments and 
            believe every experience has something to teach us.</p>
        </div>
      </section>

      {/* Fun Facts Section */}
      <section className="fun-facts">
        <img 
          src={chowPhoto} 
          className={`edge-image top-left ${hoveredImage && hoveredImage.alt === "Me and My Cat" ? "pulse" : ""}`}
          onMouseEnter={(e) => handleImageMouseEnter(e, "Me and My Cat")}
          onMouseLeave={handleImageMouseLeave}
        />
        <img 
          src={drawingPhoto} 
          className={`edge-image top-right ${hoveredImage && hoveredImage.alt === "My artwork" ? "pulse" : ""}`}
          onMouseEnter={(e) => handleImageMouseEnter(e, "My artwork")}
          onMouseLeave={handleImageMouseLeave}
        />
        <div className="content">
          <h2>Fun Facts</h2>
          <ul>
            <li>I love discovering new music and curating playlists for  
            <span className="underlined-span"> d </span>
               ifferent moods. My current favorite artist is Kendrick Lamar.</li>
            <li>Problem-solving isn't just for coding — I enjoy puzzles and logic games in my free time. I know how to solve a Rubik's cube in under one minute and can put up a good competition in Monopoly.</li>
            <li>I'm always on the lookout for interesting documentaries or thought-provoking conspiracy theories. I am a firm b
            <span className="underlined-span">e</span>
              liever in aliens and am open to the idea of the paranormal.</li>
            <li>I enjoy the peacefulness of nature, and when I am not in front of a computer, I can be found indulging in o
            <span className="underlined-span">n</span>
              e of Stephen King's many pieces of literature.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default About;