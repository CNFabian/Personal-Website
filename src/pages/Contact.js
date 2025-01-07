import React, { useRef, useState } from 'react';
import './Contact.css';

const Contact = () => {
    const formRef = useRef(null); // Create a ref for the form
    const [confirmation, setConfirmation] = useState(false);

    const scriptURL = 'https://script.google.com/macros/s/AKfycbxXuAzWvy-2hlyeimUN8RT0z3zCk-fWBfJ2LB3hoeXtpaFfYBZFQfRHBDll5JyhV7XR-g/exec';

    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent the default form submission

        const form = formRef.current; // Access the form element using the ref

        fetch(scriptURL, {
            method: 'POST',
            body: new FormData(form), // Use FormData to send the form data
        })
            .then((response) => {
                if (response.ok) {
                    setConfirmation(true);
                    alert('Thank you! Form is submitted successfully.');
                    form.reset(); // Reset the form after submission
                } else {
                    alert('There was an issue submitting your form. Please try again.');
                }
            })
            .catch((error) => {
                console.error('Error!', error.message);
                alert('An error occurred while submitting the form. Please try again.');
            });
    };

    return (
        <div className="contact-container">
            <h1>Contact Me</h1>
            <form ref={formRef} onSubmit={handleSubmit} className="contact-form" name="contact-form">
                <label htmlFor="name">Name:</label>
                <input type="text" id="name" name="Name" placeholder="Your name" required />

                <label htmlFor="subject">Subject:</label>
                <input type="text" id="subject" name="Subject" placeholder="Subject of your message" required />

                <label htmlFor="message">Message:</label>
                <textarea id="message" name="Message" placeholder="Your message" required></textarea>

                <button type="submit">Send Message</button>
            </form>
            {confirmation && <div className="confirmation-message">Thank you for your message!</div>}
        </div>
    );
};

export default Contact;
