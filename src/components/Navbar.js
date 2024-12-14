import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  // State to track if the mobile menu is open
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Function to toggle the menu
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);


  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.navigation') && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  // Close the menu on "Escape" key press
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isMenuOpen]);

  return (
    <nav className="navigation">
      <div className="navbar-header">
        <button 
          className={`hamburger ${isMenuOpen ? 'open' : ''}`} 
          onClick={toggleMenu} 
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      <ul className={`nav-links ${isMenuOpen ? 'show' : ''}`}>
        <li><Link to="/" className="nav-link" data-tooltip="Go to the homepage" onClick={closeMenu} >Home</Link></li>
        <li><Link to="/portfolio" className="nav-link" data-tooltip="View my portfolio" onClick={closeMenu}>Portfolio</Link></li>
        <li><Link to="/resume" className="nav-link" data-tooltip="Check out my resume" onClick={closeMenu}>Resume</Link></li>
        <li><Link to="/about" className="nav-link" data-tooltip="Learn more about me" onClick={closeMenu}>About</Link></li>
        <li><Link to="/secret" className="nav-link" data-tooltip="Explore hidden content" onClick={closeMenu}>Secret</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
