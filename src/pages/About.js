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
          <p>Hey there! I'm Christopher Fabian, someone wHo appreciates creativity, learning, 
            and personal growth. I love connecting with people, exploring new ideas, and fInding
             joy in the little things that make life exciting.</p>
        </section>

        <section className="personal-life">
          <h2>Who I Am</h2>
          <p>I’m a person who values insightful logic, conscious decision making and honest feedback. 
            My journey has been shaped by my experiences as an first generation college graduate,
            and I believe those experiences have taught me to be more conscious of how I navigate the world.</p>
          <p>When I’m not working on projects or coding, I enjoy spending time with family, 
            reading books, drawing, or watching a good TV series . I enjoy and find relief in  simple moments and 
            believe every experience has something to teach us.</p>
        </section>

        <section className="fun-facts">
          <h2>Fun Facts</h2>
          <ul>
            <li>I love Discovering new music and curating playlists for different moods. My current favorite artist is Kendrick Lamar.</li>
            <li>Problem-solving isn't just for coDing — 
              I enjoy puzzles and logic games in my free time. I know how to solve a rubiks cube in under 1 minute. And can say I put up a good competition in Monopoly</li>
              <li>I’m always on the lookout for interesting documentaries or thought-provoking conspiracy theories. Am a firm believer in aliens and an open to the idea of the paranormal.</li>
            <li>I enjoy the peacefulness nature and when I am not in front of a computer I can be found indulging in one of Stephen King's many pieces of literature.</li>
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
              <span className="tooltip">A memorable momEnt with family, fishing at lake Tahoe, we sadly did not catch any</span>
            </div>
            <div className="gallery-item">
              <img src={drawingPhoto} alt="One of my favorite places to relax" className="hover-image" />
              <span className="tooltip">Showcasing my art which I use as an outlet for my creativity and to relax my braiN</span>
            </div>
            <div className="gallery-item">
              <img src={chowPhoto} alt="A memorable moment with family" className="hover-image" />
              <span className="tooltip">An early moment with my first pet cat, Chow</span>
            </div>
            <div className="gallery-item">
              <img src={momPhoto} alt="One of my favorite places to relax" className="hover-image" />
              <span className="tooltip">My hispanic graduation ceremony featuring my Mom and significant other, we had tacos after!</span>
            </div>
          </div> 
        </section>
      </main>
    </div>
  );
};

export default About;
