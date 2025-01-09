import React, { useState, useEffect } from 'react';
import './Home.css'; // Import CSS file for styles
import profilePhoto from '../assets/profile.jpg'; // Replace with the actual path to your profile photo

const Home = () => {
  const [typedName, setTypedName] = useState('');
  const fullName = "Christopher N Fabian";
  const typingSpeed = 100; // Typing speed in ms

  useEffect(() => {
    let currentIndex = 0;
  
    const typingInterval = setInterval(() => {
      if (currentIndex < fullName.length) {
        setTypedName((prev) => prev + fullName[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(typingInterval);
  
        // Reset after a delay
        setTimeout(() => {
          setTypedName('');
          currentIndex = 0;
        }, 5000); // Delay before restarting
      }
    }, typingSpeed);
  
    return () => clearInterval(typingInterval);
  }, [fullName, typingSpeed]);

  return (
    <>
      {/* Hero Section */}
      <div className="home-page">
        <section className="hero" id="home">
          <div className="hero-content">
            {/* Profile Photo */}
            <div className="profile-photo-container">
              <img src={profilePhoto} alt="Christopher N Fabian" className="profile-photo" />
            </div>

            {/* Text Content */}
            <div className="hero-text">
              <h1>Hello, I'm</h1>
              <span>Christopher N Fabian</span>
            </div>
          </div>
          <p>I challenge you to discover my secret!</p>
        </section>
      </div>
    </>
  );
};

export default Home;
