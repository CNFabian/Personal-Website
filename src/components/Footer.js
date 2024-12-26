import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} Christopher Fabian. All Rights Reserved.</p>
      <ul className="footer-social-links">
        <li>
          <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-github"></i> {/* Font Awesome GitHub Icon */}
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-linkedin"></i> {/* Font Awesome LinkedIn Icon */}
          </a>
        </li>
      </ul>
    </footer>
  );
};

export default Footer;
