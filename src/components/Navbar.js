import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
  <nav class="navigation">
    <ul class="nav-links">
      <li><a href="/" class="nav-link" data-tooltip="Go to the homepage">Home</a></li>
      <li><a href="/portfolio" class="nav-link" data-tooltip="View my portfolio">Portfolio</a></li>
      <li><a href="/resume" class="nav-link" data-tooltip="Check out my resume">Resume</a></li>
      <li><a href="/about" class="nav-link" data-tooltip="Learn more about me">About</a></li>
      <li><a href="/secret" class="nav-link" data-tooltip="Explore hidden content">Secret</a></li>
    </ul>
  </nav>
  );
};

export default Navbar;
