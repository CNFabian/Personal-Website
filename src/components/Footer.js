import React from 'react';
import PixelCharacter from '../components/PixelCharacter';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
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
      <p>&copy; {new Date().getFullYear()} Christopher Fabian.</p>
      
      <div className="character-hover-area">
        <PixelCharacter />
      </div>
    </footer>
  );
};

export default Footer;