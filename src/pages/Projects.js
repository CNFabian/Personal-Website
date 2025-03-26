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
      </div>
    </div>
  );
};

export default Projects;