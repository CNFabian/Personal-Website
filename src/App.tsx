import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Resume from './pages/Resume';
import Secret from './pages/Secret';
import Contact from './pages/Contact';
import Projects from './pages/Projects';

import './styles/base/_app.scss';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Puzzle1Page from './pages/puzzle/Puzzle1Page';
import Puzzle2Page from './pages/puzzle/Puzzle2Page';
import Puzzle3Page from './pages/puzzle/Puzzle3Page';

import ImageCaptioner from './pages/ImageCaptioner';

// Lazy-load the game pages so Phaser is not bundled with portfolio pages
const EgyptianRatscrew = lazy(() => import('./pages/EgyptianRatscrew'));
const GinRummy = lazy(() => import('./pages/GinRummy'));
const Casino = lazy(() => import('./pages/Casino'));

const GameLoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '80vh',
    fontSize: '1.2rem',
    color: '#666',
  }}>
    Loading game...
  </div>
);

const App = () => {
  const location = useLocation();

  // Add page-specific class to the <body> tag
  useEffect(() => {
    const pageName = location.pathname.replace('/', '') || 'home';
    document.body.className = `page-${pageName}`;
  }, [location]);

  const isFullscreenRoute = ['/casino', '/egyptian-ratscrew', '/gin-rummy'].includes(location.pathname);

  return (
    <>
      {!isFullscreenRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/secret" element={<Secret />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/puzzle1" element={<Puzzle1Page />} />
        <Route path="/puzzle2" element={<Puzzle2Page />} />
        <Route path="/puzzle3" element={<Puzzle3Page />} />
        <Route path="/image_captioner" element={<ImageCaptioner />} />
        <Route
          path="/egyptian-ratscrew"
          element={
            <Suspense fallback={<GameLoadingFallback />}>
              <EgyptianRatscrew />
            </Suspense>
          }
        />
        <Route
          path="/gin-rummy"
          element={
            <Suspense fallback={<GameLoadingFallback />}>
              <GinRummy />
            </Suspense>
          }
        />
        <Route
          path="/casino"
          element={
            <Suspense fallback={<GameLoadingFallback />}>
              <Casino />
            </Suspense>
          }
        />
      </Routes>
      {!isFullscreenRoute && <Footer />}
    </>
  );
};

const WrappedApp = () => (
  <Router>
    <App />
  </Router>
);

export default WrappedApp;
