import React from 'react';
import PixelCharacter from '../components/PixelCharacter';
import SoloLevelingCharacter from '../components/Sololeveling';
import Venom from '../components/Venom';
import Patrick from '../components/Patrick';
import BowserJr from '../components/BowserJr'
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} Christopher Fabian.</p>
      
      <div className="footer-content">
        <div className="footer-grid-left">
          <div className="grid-area grid-area-1">
            <PixelCharacter />
          </div>
          <div className="grid-area grid-area-2">
             <Venom />
          </div>
          <div className="grid-area grid-area-3">
            <BowserJr />
          </div>
        </div>
        
        <ul className="footer-social-links">
          <li>
            <a href="https://github.com/CNFabian">
              <i className="fab fa-github"></i>
            </a>
          </li>
          <li>
            <a href="https://www.linkedin.com/in/christopher-fabian7777">
              <i className="fab fa-linkedin"></i>
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/chrislucky77/">
              <i className="fab fa-instagram"></i>
            </a>
          </li>
        </ul>
        
        <div className="footer-grid-right">
          <div className="grid-area grid-area-4">
            <Patrick />
          </div>
          <div className="grid-area grid-area-5"></div>
          <div className="grid-area grid-area-6">
             <SoloLevelingCharacter />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;