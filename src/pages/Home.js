import React from 'react';
import './Home.css'; // Import CSS file for styles
import { Helmet } from 'react-helmet'; // For <head> modifications

const Home = () => {
  return (
    <>
      {/* Head Section (use react-helmet) */}
      <Helmet>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Portfolio</title>
      </Helmet>

      {/* Navigation */}
      <nav className="navigation">
        <a href="#home">Home</a>
        <a href="#portfolio">Portfolio</a>
        <a href="#resume">Resume</a>
        <a href="#about">About</a>
        <a href="#secret">Secret</a>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <h1>Hello, I'm <span>Christopher N Fabian</span></h1>
        <p>Presenting my Resume!</p>
      </section>

      {/* Portfolio Section */}
      <section className="portfolio" id="portfolio">
        <h2>Featured Portfolio</h2>
        <div className="categories">
          <a href="#all">All</a>
          <a href="#packaging">Packaging</a>
          <a href="#mockup">Mockup</a>
          <a href="#typography">Typography</a>
          <a href="#photography">Photography</a>
        </div>
       {/* <div className="gallery">
          <div className="gallery-item">
            <img src="/images/project1.jpg" alt="Project 1" /> 
          </div>
          <div className="gallery-item">
            <img src="/images/project2.jpg" alt="Project 2" />
          </div>
          <div className="gallery-item">
            <img src="/images/project3.jpg" alt="Project 3" />
          </div>
          <div className="gallery-item">
            <img src="/images/project4.jpg" alt="Project 4" />
          </div>
        </div>
        */}
      </section>
    </>
  );
};

export default Home;
