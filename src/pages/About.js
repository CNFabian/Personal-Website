import React, { useEffect, useRef } from "react";
import "./About.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import beachPhoto from '../assets/beach.png';
import scenicPhoto from '../assets/scenic_view.png';
import familyPhoto from '../assets/family.png';
import drawingPhoto from '../assets/drawing.png';
import chowPhoto from '../assets/chow.png';
import momPhoto from '../assets/mom.png';
import stickman from "../assets/stickman.png";
gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const stickmanRef = useRef(null);

  useEffect(() => {
    const stickman = stickmanRef.current;

    gsap.to(stickman, {
      scrollTrigger: {
        trigger: ".image-container", // Section where images are
        start: "top center",
        end: "bottom center",
        scrub: 1, // Smoothly follows scroll
      },
      x: "80vw", // Moves stickman across the screen
      ease: "power1.out",
    });

    gsap.to(stickman, {
      scrollTrigger: {
        trigger: ".jump-point",
        start: "top center",
        end: "bottom center",
        toggleActions: "play none none reverse",
      },
      y: -150, // Makes stickman jump
      duration: 0.5,
      ease: "power2.out",
    });

    gsap.to(stickman, {
      scrollTrigger: {
        trigger: ".jump-end",
        start: "top center",
        end: "bottom center",
        toggleActions: "play none none reverse",
      },
      y: 0, // Stickman lands on the next image
      duration: 0.5,
      ease: "power2.in",
    });
  }, []);

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="hero-about">
        <div className="hero-content-about">
          <h1>About Me</h1>
          <p>Hey there! I'm Christopher Fabian, someone who appreciates creativity, learning, 
            and personal growth. I love connecting with people, exploring new ideas, and finding 
            joy in the little things that make life exciting.</p>
        </div>
      </section>

      {/* Personal Life Section */}
      <section className="personal-life">
      <img src={scenicPhoto} alt="Me and My Cat" className="edge-image top-left" />
        <img src={familyPhoto} alt="Family fishing trip" className="edge-image bottom-right" />
        <div className="content">
          <h2>Who I Am</h2>
          <p>I’m a person who values insightful logic, conscious decision-making, and honest feedback. 
            My journey has been shaped by my experiences as a first-generation college graduate, 
            and I believe those experiences have taught me to be more conscious of how I navigate the world.</p>
          <p>When I’m not working on projects or coding, I enjoy spending time with family, 
            reading books, drawing, or watching a good TV series. I enjoy and find relief in simple moments and 
            believe every experience has something to teach us.</p>
        </div>
      </section>

      {/* Fun Facts Section */}
      <section className="fun-facts">
        <img src={chowPhoto} alt="Me and My Cat" className="edge-image top-left" />
        <img src={drawingPhoto} alt="My artwork" className="edge-image top-right" />
        <div className="content">
          <h2>Fun Facts</h2>
          <ul>
            <li>I love discovering new music and curating playlists for different moods. My current favorite artist is Kendrick Lamar.</li>
            <li>Problem-solving isn't just for coding — I enjoy puzzles and logic games in my free time. I know how to solve a Rubik's cube in under one minute and can put up a good competition in Monopoly.</li>
            <li>I’m always on the lookout for interesting documentaries or thought-provoking conspiracy theories. I am a firm believer in aliens and am open to the idea of the paranormal.</li>
            <li>I enjoy the peacefulness of nature, and when I am not in front of a computer, I can be found indulging in one of Stephen King's many pieces of literature.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default About;
