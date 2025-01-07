import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        message: ''
    });

    const [confirmation, setConfirmation] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const formData = {
            name: e.target.name.value,
            subject: e.target.subject.value,
            message: e.target.message.value,
        };
    
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxtoUdj7G2xMBA5FUpYX0tW2sogWP3BOzreklmk98yTDQ6t_SzMqqQkl708HlWXe7mjrQ/exec'; // Replace with your Apps Script Web App URL
    
        try {
            const response = await fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            const result = await response.json();
            if (result.status === 'success') {
                alert('Message sent successfully!');
            } else {
                alert(result.message || 'An error occurred.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was an error. Please try again.');
        }
    };
    

    return (
        <div className="contact-container">
            <h1>Contact Me</h1>
            <form onSubmit={handleSubmit} className="contact-form">
                <label htmlFor="name">Name:</label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Your name" 
                    required 
                />

                <label htmlFor="subject">Subject:</label>
                <input 
                    type="text" 
                    id="subject" 
                    name="subject" 
                    value={formData.subject} 
                    onChange={handleChange} 
                    placeholder="Subject of your message" 
                    required 
                />

                <label htmlFor="message">Message:</label>
                <textarea 
                    id="message" 
                    name="message" 
                    value={formData.message} 
                    onChange={handleChange} 
                    placeholder="Your message" 
                    required 
                />

                <button type="submit">Send Message</button>
            </form>
            {confirmation && <div className="confirmation-message">Thank you for your message!</div>}
        </div>
    );
};

export default Contact;
