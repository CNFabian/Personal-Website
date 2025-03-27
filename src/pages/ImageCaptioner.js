import React, { useState, useRef } from 'react';
import { MapPin, Upload, Image } from 'lucide-react';
import './ImageCaptioner.css';

const ImageCaptioner = () => {
  // Replace with your actual API Gateway URL from AWS Lambda
  const API_ENDPOINT = 'https://4wt9202b30.execute-api.us-west-1.amazonaws.com/prod/caption';
  
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
      <h2 className="section-heading">Image Captioning Project</h2>
      
      <div className="timeline">
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
      </div>
    </div>
  );
};

export default ImageCaptioner;