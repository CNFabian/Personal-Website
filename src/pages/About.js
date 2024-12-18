import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <main>
        <section className="hero">
          <img src="path/to/your/profile-picture.jpg" alt="Profile picture of Christopher" className="profile-picture" />
          <h1>About Me</h1>
          <p>Hey there! I’m Christopher Fabian, someone who appreciates creativity, learning, and personal growth. I love connecting with people, exploring new ideas, and finding joy in the little things that make life exciting.</p>
        </section>

        <section className="personal-life">
          <h2>Who I Am</h2>
          <p>I’m a person who values self-awareness, resilience, and thoughtful reflection. My journey has been shaped by my experiences as an immigrant, and I believe those experiences have taught me to be more conscious of how I navigate the world.</p>
          <p>When I’m not working on projects or coding, I enjoy spending time with family, reading books, and exploring outdoor spaces. I find meaning in simple moments and believe every experience has something to teach us.</p>
        </section>

        <section className="fun-facts">
          <h2>Fun Facts</h2>
          <ul>
            <li>I love discovering new music and curating playlists for different moods.</li>
            <li>Problem-solving isn't just for coding — I enjoy puzzles and logic games in my free time.</li>
            <li>I’m always on the lookout for interesting documentaries or thought-provoking articles.</li>
          </ul>
        </section>

        <section className="gallery">
          <h2>Gallery</h2>
          <div className="gallery-item"><img src="path/to/image1.jpg" alt="A scenic view I enjoyed" /></div>
          <div className="gallery-item"><img src="path/to/image2.jpg" alt="A memorable moment with family" /></div>
          <div className="gallery-item"><img src="path/to/image3.jpg" alt="One of my favorite places to relax" /></div>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 Christopher Fabian. All Rights Reserved.</p>
        <ul>
          <li><a href="https://github.com/yourusername" target="_blank">GitHub</a></li>
          <li><a href="https://www.linkedin.com/in/yourusername" target="_blank">LinkedIn</a></li>
        </ul>
      </footer>
    </div>
  );
};

export default About;
