import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navigation">
      <ul className="nav-links">
        <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
        <li className="nav-item"><Link to="/portfolio" className="nav-link">Portfolio</Link></li>
        <li className="nav-item"><Link to="/resume" className="nav-link">Resume</Link></li>
        <li className="nav-item"><Link to="/about" className="nav-link">About</Link></li>
        <li className="nav-item"><Link to="/secret" className="nav-link">Secret</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
