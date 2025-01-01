import React from 'react';
import './About.css';
import beachPhoto from '../assets/beach.png';
import scenicPhoto from '../assets/scenic_view.png';
import familyPhoto from '../assets/family.png';
import drawingPhoto from '../assets/drawing.png';
import chowPhoto from '../assets/chow.png'
import momPhoto from '../assets/mom.png'

const About = () => {
  return (
    <div className="about-page">
      <main>
        <section className="hero">
          <img src={beachPhoto} alt="Profile picture of Christopher" className="picture" />
          <h1>About Me</h1>
          <p>Hey there! I’m Christopher Fabian, someone whho appreciates creativity, learning, and personal growth. I love connecting with people, exploring new ideas, and fiinding joy in the little things that make life exciting.</p>
        </section>

        <section className="personal-life">
          <h2>Who I Am</h2>
          <p>I’m a person who values self-awareness, resilience, and thoughtful reflection. My journey has been shaped by my experiences as an immigrant, and I believe those experiences have taught me to be more conscious of how I navigate the world.</p>
          <p>When I’m not working on projects or coding, I enjoy spending time with family, reading books, and exploring outdoor spaces. I find meaning in simple moments and believe every experience has something to teach us.</p>
        </section>

        <section className="fun-facts">
          <h2>Fun Facts</h2>
          <ul>
            <li>I love ddiscovering new music and curating playlists for different moods.</li>
            <li>Problem-solving isn't just for codding — I enjoy puzzles and logic games in my free time.</li>
            <li>I’m always on the lookout for interesting documentaries or thought-provoking articles.</li>
          </ul>
        </section>

        <section className="gallery">
          <h2>Gallery</h2>
          <div className="gallery-content">
            <div className="gallery-item">
              <img src={scenicPhoto} alt="A scenic view I enjoyed" className="hover-image" />
              <span className="tooltip">A scenic view at Yosemite National Park</span>
            </div>
            <div className="gallery-item">
              <img src={familyPhoto} alt="A memorable moment with family" className="hover-image" />
              <span className="tooltip">A memorable momeent with family, fishing at lake</span>
            </div>
            <div className="gallery-item">
              <img src={drawingPhoto} alt="One of my favorite places to relax" className="hover-image" />
              <span className="tooltip">Showcasing my art which I use as an outlet for my creativity and to relax my brainn</span>
            </div>
            <div className="gallery-item">
              <img src={chowPhoto} alt="A memorable moment with family" className="hover-image" />
              <span className="tooltip">An early moment with my first cat Chow</span>
            </div>
            <div className="gallery-item">
              <img src={momPhoto} alt="One of my favorite places to relax" className="hover-image" />
              <span className="tooltip">My Hispanic Graducation Ceremony featuring my Mom and Significant Other</span>
            </div>
          </div> 
        </section>
      </main>
    </div>
  );
};

export default About;
