import React from 'react';
import './Home.css'; // Import CSS file for styles
import profilePhoto from '../assets/profile.jpg'; // Replace with the actual path to your profile photo

const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <div className='home-page'>
        <section className="hero" id="home">
          <div className="hero-content">
            {/* Profile Photo */}
            <div className="profile-photo-container">
              <img src={profilePhoto} alt="Christopher N Fabian" className="profile-photo" />
            </div>

            {/* Text Content */}
            <div className="hero-text">
              <h1>Hello, I'm <span>Christopher N Fabian</span></h1>
              <p>Presenting my Website!</p>
            </div>
          </div>
        </section>

        {/* Portfolio Section
        <section className="portfolio" id="portfolio">
          <h2>Featured Portfolio</h2>
          <div className="categories">
            <a href="#all">All</a>
            <a href="#packaging">Packaging</a>
            <a href="#mockup">Mockup</a>
            <a href="#typography">Typography</a>
            <a href="#photography">Photography</a>
          </div>
        </section>
        */}
      </div>
    </>
  );
};

export default Home;
