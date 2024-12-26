import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Resume from './pages/Resume';
import Secret from './pages/Secret';

import './App.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Puzzle1Page from './pages/puzzle/Puzzle1Page';
import Puzzle2Page from './pages/puzzle/Puzzle2Page';
import Puzzle3Page from './pages/puzzle/Puzzle3Page';

const App = () => {
  const location = useLocation();

  // Add page-specific class to the <body> tag
  useEffect(() => {
    const pageName = location.pathname.replace('/', '') || 'home';
    document.body.className = `page-${pageName}`;
  }, [location]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/secret" element={<Secret />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/puzzle1" element={<Puzzle1Page />} />
        <Route path="/puzzle2" element={<Puzzle2Page />} />
        <Route path="/puzzle3" element={<Puzzle3Page />} />
      </Routes>
      <Footer /> 
    </>
  );
};

const WrappedApp = () => (
  <Router>
    <App />
  </Router>
);

export default WrappedApp;
