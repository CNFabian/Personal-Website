import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const currentPage = location.pathname.split('/')[1] || 'home'; // Extract the page name from the URL

  // Function to toggle the menu
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className={`navigation ${currentPage}-nav`}>
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
        <li>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active-link' : ''}`} 
            data-tooltip="Go to the homepage" 
            onClick={closeMenu}>
            Home
          </Link>
        </li>
        <li>
          <Link to="/portfolio" className={`nav-link ${location.pathname.startsWith('/portfolio') ? 'active-link' : ''}`} 
            data-tooltip="View my portfolio" 
            onClick={closeMenu}>
            Portfolio
          </Link>
        </li>
        <li>
          <Link to="/resume" className={`nav-link ${location.pathname.startsWith('/resume') ? 'active-link' : ''}`} 
            data-tooltip="Check out my resume" 
            onClick={closeMenu}>
            Resume
          </Link>
        </li>
        <li>
          <Link to="/about" className={`nav-link ${location.pathname.startsWith('/about') ? 'active-link' : ''}`} 
            data-tooltip="Learn more about me" 
            onClick={closeMenu}>
            About
          </Link>
        </li>
        <li> 
          <Link to="/secret" className={`nav-link ${location.pathname.startsWith('/secret') ? 'active-link' : ''}`} 
            data-tooltip="Explore hidden content" 
            onClick={closeMenu}>
            Secret
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
