import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <ul className="footer-social-links">
        <li>
          <a href="https://github.com/CNFabian" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-github"></i> {/* Font Awesome GitHub Icon */}
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/christopher-fabian7777" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-linkedin"></i> {/* Font Awesome LinkedIn Icon */}
          </a>
        </li>
        <li>
          <a href="https://www.instagram.com/chrislucky77/" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram"></i> {/* Font Awesome Instagram Icon */}
          </a>
        </li>
      </ul>
      <p>&copy; {new Date().getFullYear()} Christopher Fabian.</p>
    </footer>
  );
};

export default Footer;
