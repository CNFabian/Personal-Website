import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Upload, Image } from 'lucide-react';
import './Projects.css';

const Projects = () => {
  // Replace with your actual API Gateway URL from AWS Lambda
    const API_ENDPOINT = 'https://nb8dh56wmc.execute-api.us-west-1.amazonaws.com/prod/caption';
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const handleFileChange = (event) => {
      const file = event.target.files[0];
      processFile(file);
    };
    
    const processFile = (file) => {
      if (!file) return;
      
      // Reset states
      setError('');
      setCaption('');
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a JPG, PNG, or GIF image.');
        setSelectedFile(null);
        setImagePreview(null);
        return;
      }
      
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File is too large. Maximum size is 5MB.');
        setSelectedFile(null);
        setImagePreview(null);
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    };
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    };
    
    const handleClick = () => {
      fileInputRef.current.click();
    };
    
    const generateCaption = async () => {
      if (!selectedFile) {
        setError('Please select an image first');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        // Get base64 data from preview
        const imageData = imagePreview.split(',')[1];
        
        // Log truncated version of the data to debug
        console.log("Sending image data to API...");
        console.log("API Endpoint:", API_ENDPOINT);
        
        // Create the request body
        const requestBody = JSON.stringify({
          image: imageData
        });
        
        console.log("Request payload size:", Math.round(requestBody.length / 1024), "KB");
        
        // Send to API
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requestBody
        });
        
        console.log("Response status:", response.status);
        console.log("Response status text:", response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text().catch(e => "Could not read error response");
          console.error("Error response:", errorText);
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        console.log("Raw response:", responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
        
        // Try to parse the response
        let data;
        try {
          data = JSON.parse(responseText);
          console.log("Parsed response data:", data);
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          throw new Error(`Error parsing response: ${parseError.message}`);
        }
        
        if (data && data.caption) {
          console.log("Caption found:", data.caption);
          setCaption(data.caption);
        } else {
          console.error("No caption in response:", data);
          throw new Error('No caption found in the response');
        }
      } catch (error) {
        console.error("Full error:", error);
        setError(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="projects-container">
      <h2 className="section-heading">Professional Experience</h2>
      
        <div className="timeline">
          <div className="timeline-item timeline-item-left">
            <div className="timeline-content">
              <div className="timeline-date">March 2025</div>
              <h3 className="timeline-role">🍳 Pantry Pal - Smart Kitchen Management Platform</h3>
              <h4 className="timeline-company">Full-Stack Web Application</h4>
           
              <a href="https://foodpantry-pal.netlify.app/" className="link">Pantry Pal Prototype</a>
          
              <div className="timeline-location">
                <MapPin size={16} />
                Personal Project
              </div>
              
              <div className="skill-tags">
                <span className="skill-tag">React 19</span>
                <span className="skill-tag">Firebase</span>
                <span className="skill-tag">Google Gemini AI</span>
                <span className="skill-tag">Tailwind CSS</span>
                <span className="skill-tag">Vite</span>
                <span className="skill-tag">PWA</span>
                <span className="skill-tag">JavaScript ES6+</span>
              </div>
              
              <p className="project-description">
                Developed an intelligent cooking companion that revolutionizes kitchen inventory management and recipe discovery. The platform combines modern web technologies with <span className="skill-highlight">AI-powered recipe generation</span> to reduce food waste and spark culinary creativity.
              </p>
              
              <ul className="timeline-achievements">
                <li>Built using <span className="skill-highlight">React 19 and Vite</span> for optimal performance, with <span className="skill-highlight">Firebase</span> handling real-time data synchronization and user authentication.</li>
                <li>Integrated <span className="skill-highlight">Google's Gemini 2.0 Flash API</span> to drive intelligent recipe generation based on available ingredients, dietary restrictions, and cuisine preferences.</li>
                <li>Developed a robust <span className="skill-highlight">Firestore database architecture</span> featuring user-specific data isolation, batch operations, and automated cleanup routines.</li>
                <li>Implemented <span className="skill-highlight">PWA functionality</span> with offline capabilities through service workers and intelligent unit conversion system.</li>
                <li>Created features including smart inventory management, expiration monitoring, interactive cooking mode, and real-time recipe validation.</li>
                <li>Designed responsive interface with mobile-first approach, achieving consistent experience across desktop, tablet, and mobile platforms.</li>
              </ul>
              
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(138, 122, 112, 0.1)', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>
                  <strong>Future Development:</strong> Planning to develop an iOS app version with enhanced features and more robust functionality building upon this prototype foundation.
                </p>
              </div>
            </div>
          </div>

          <div className="timeline-item timeline-item-left video-timeline-item">
            <div className="timeline-content video-content">
              <h3 className="timeline-role">Project Showcase Video</h3>
              <div className="video-container">
                <iframe
                  width="100%"
                  height="250"
                  src="https://www.youtube.com/embed/u8g9pNwYBTQ?autoplay=1&mute=1"
                  title="Pantry Pal Showcase"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="video-caption">Video demonstration of the Pantry Pal Web Application</p>
            </div>
          </div>

          <div className="timeline-item timeline-item-right">
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
          
          <div className="timeline-item timeline-item-right video-timeline-item">
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

          <div className="timeline-item timeline-item-left">
            <div className="timeline-content">
              <div className="timeline-date">March 2025</div>
              <h3 className="timeline-role">AI Image Captioning</h3>
              <h4 className="timeline-company">Machine Learning Demo</h4>
              <div className="timeline-location">
                <MapPin size={16} />
                AWS Lambda Function
              </div>
              
              <div className="skill-tags">
                <span className="skill-tag">Machine Learning</span>
                <span className="skill-tag">AWS Lambda</span>
                <span className="skill-tag">React</span>
                <span className="skill-tag">Computer Vision</span>
                <span className="skill-tag">Hugging Face API</span>
              </div>
              
              <p className="project-description">
                This demo showcases a <span className="skill-highlight">machine learning model</span> that can automatically generate captions for images using the BLIP image captioning model from Hugging Face.
              </p>
              
              <div 
                className={`upload-area ${isDragging ? 'highlight' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="image-preview" 
                  />
                ) : (
                  <div className="upload-prompt">
                    <Upload size={40} className="upload-icon" />
                    <p>Drag and drop an image here or click to upload</p>
                    <p className="subtle-text">Accepts JPG, PNG or GIF files up to 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="file-input"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileChange}
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                className="generate-button"
                onClick={generateCaption}
                disabled={!selectedFile || loading}
              >
                {loading ? 'Generating...' : 'Generate Caption'}
              </button>
              
              {loading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Analyzing image and generating caption...</p>
                </div>
              )}
              
              {caption && (
                <div className="caption-container">
                  <h4 className="caption-heading">
                    <Image size={16} className="caption-icon" />
                    Generated Caption
                  </h4>
                  <p className="caption-text">{caption}</p>
                </div>
              )}
              
              <ul className="timeline-achievements">
                <li>Implemented an image captioning service using the <span className="skill-highlight">Hugging Face API</span> and deployed it as an <span className="skill-highlight">AWS Lambda function</span>.</li>
                <li>Created a responsive React interface with drag-and-drop upload functionality.</li>
                <li>Integrated with the <span className="skill-highlight">BLIP image captioning model</span> to generate accurate and descriptive captions for a wide variety of images.</li>
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