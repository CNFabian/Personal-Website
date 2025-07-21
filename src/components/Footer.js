import React from 'react';
import PixelCharacter from '../components/PixelCharacter';
import './Footer.css';

const Footer = () => {
  
  return (
    <footer className="footer">
      <ul className="footer-social-links">
        <li>
          <a href="https://github.com/CNFabian">
            <i className="fab fa-github"></i> {/* Font Awesome GitHub Icon */}
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/christopher-fabian7777">
            <i className="fab fa-linkedin"></i> {/* Font Awesome LinkedIn Icon */}
          </a>
        </li>
        <li>
          <a href="https://www.instagram.com/chrislucky77/">
            <i className="fab fa-instagram"></i> {/* Font Awesome Instagram Icon */}
          </a>
        </li>
      </ul>
      <p>&copy; {new Date().getFullYear()} Christopher Fabian.</p>
      {/* Add before the closing </> */}
       <div className="footer-character-area">
      <PixelCharacter
        initialGif="/assets/zenitsu/idle.png"
        animations={{
          lighting_landing: "/assets/zenitsu/lightning-landing.gif",
          stance: "/assets/zenitsu/stance.gif",
          large_charge: "/assets/zenitsu/large-charge.gif",
          wave: "/assets/zenitsu/wave.gif",
          dance: "/assets/zenitsu/dance.gif",
          surprise: "/assets/zenitsu/surprise.gif"
        }}
        scale={1.5}
        isFooterCharacter={true}
      />
      </div>
    </footer>
  );
};

export default Footer;
