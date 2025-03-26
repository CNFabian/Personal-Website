import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import './Projects.css';

const Projects = () => {
  return (
    <div className="projects-container">
      <h2 className="section-heading">Professional Experience</h2>
      
      <div className="timeline">
      <div className="timeline-item timeline-item-left">
        <div className="timeline-content">
              <div className="timeline-date">January 2025 - March 2025</div>
              <h3 className="timeline-role">Website Redesign & Development Contractor</h3>
              <h4 className="timeline-company">Mitchell First Circuit CASA</h4>
              <div className="timeline-location">
                <MapPin size={16} />
                Remote
              </div>
              
              <div className="skill-tags">
                <span className="skill-tag">HTML</span>
                <span className="skill-tag">CSS</span>
                <span className="skill-tag">JavaScript</span>
                <span className="skill-tag">Figma</span>
                <span className="skill-tag">Adobe After Effects</span>
              </div>
              
              <ul className="timeline-achievements">
                <li>Redesigned and developed a responsive website using HTML, CSS, and JavaScript, improving accessibility and user experience.</li>
                <li>Used Figma to design the site's layout and visual elements, ensuring a user-friendly experience.</li>
                <li>Enhanced navigation and added interactive elements to effectively engage volunteers and donors.</li>
                <li>Created a video in Adobe After Effects to showcase the redesign process.</li>
              </ul>
            </div>
   
      
        </div>

        <div className="timeline-item timeline-item-left video-timeline-item">
          <div className="timeline-content video-content">
            <h3 className="timeline-role">Project Showcase Video</h3>
            <div className="video-container">
              <iframe
                width="100%"
                height="250"
                src="https://www.youtube.com/embed/l3joHmHmnhc?autoplay=1&mute=1"
                title="Website Redesign Showcase"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <p className="video-caption">Video demonstration of the Mitchell First Circuit CASA website redesign process</p>
          </div>
        </div>
        
        <div className="timeline-item timeline-item-right">

        <div className="timeline-content">
                <div className="timeline-date">May 2024 - July 2024</div>
                <h3 className="timeline-role">Solutions Developer</h3>
                <h4 className="timeline-company">Leading Edge Construction</h4>
                <div className="timeline-location">
                  <MapPin size={16} />
                  Los Banos, CA
                </div>
                
                <div className="skill-tags">
                  <span className="skill-tag">AI Solutions</span>
                  <span className="skill-tag">Presentations</span>
                  <span className="skill-tag">Workflow Integration</span>
                </div>
                
                <ul className="timeline-achievements">
                  <li>Conducted presentations to the office team on <span className="skill-highlight">AI applications</span> in the workplace; currently discussing <span className="skill-highlight">AI integration</span> into their workflow.</li>
                </ul>
              </div>
        
        </div>

        <div className="timeline-item timeline-item-left">
        <div className="timeline-content">
            <div className="timeline-date">November 2023 - April 2024</div>
            <h3 className="timeline-role">Application Developer</h3>
            <h4 className="timeline-company">Equity Justice and Inclusive Excellence Department at UC Merced</h4>
            <div className="timeline-location">
              <MapPin size={16} />
              University of California, Merced, CA
            </div>
            
            <div className="skill-tags">
              <span className="skill-tag">Flutterflow</span>
              <span className="skill-tag">Interactive Tutorials</span>
              <span className="skill-tag">YouTube API</span>
              <span className="skill-tag">Mobile App Development</span>
            </div>
            
            <ul className="timeline-achievements">
              <li>Collaborated with a team to develop an interactive learning module app for the EJIE department using <span className="skill-highlight">Flutterflow</span>, featuring <span className="skill-highlight">interactive tutorials</span>, timed readings, linked articles, <span className="skill-highlight">YouTube API integration</span>, and quizzes.</li>
            </ul>
          </div>
        </div>
        
        <div className="timeline-item timeline-item-right">

        <div className="timeline-content">
            <div className="timeline-date">August 2023 - December 2023</div>
            <h3 className="timeline-role">Web App Developer</h3>
            <h4 className="timeline-company">Sunburst Agri Biotech Solutions LLC</h4>
            <div className="timeline-location">
              <MapPin size={16} />
              University of California, Merced, CA
            </div>
            
            <div className="skill-tags">
              <span className="skill-tag">Computer Vision</span>
              <span className="skill-tag">CNN</span>
              <span className="skill-tag">Machine Learning</span>
              <span className="skill-tag">Image Processing</span>
              <span className="skill-tag">Cross-platform</span>
            </div>
            
            <ul className="timeline-achievements">
              <li>Designed and implemented a <span className="skill-highlight">computer vision model</span> utilizing <span className="skill-highlight">Convolutional Neural Networks (CNN)</span> to classify pathogen types with high accuracy. Trained the algorithm on a <span className="skill-highlight">diverse dataset</span> to enhance reliability and consistency.</li>
              <li>Integrated image processing and machine learning techniques into a <span className="skill-highlight">cross-platform application</span> for Sunburst Agri Biotech Solutions LLC, delivering a <span className="skill-highlight">user-friendly web and desktop solution</span> for real-time pathogen identification.</li>
            </ul>
          </div>

       
       

       
        </div>


      </div>
    </div>
  );
};

export default Projects;