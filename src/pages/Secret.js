import React, { useState } from 'react';
import './Secret.css';

const Secret = () => {
  const [password, setPassword] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const correctPassword = 'open-sesame'; // Change this to your desired password

  const handleInputChange = (e) => {
    setPassword(e.target.value);
  };

  const handleRevealSecret = () => {
    if (password === correctPassword) {
      setIsRevealed(true);
      setErrorMessage('');
    } else {
      setErrorMessage('Incorrect password. Try again.');
    }
  };

  return (
    <div className="secret-container">
      <h1 className="ominous-title">The Secret Awaits...</h1>
      {!isRevealed ? (
        <div className="password-box">
          <p className="ominous-instructions">Enter the password to reveal the secret:</p>
          <input 
            type="password" 
            className="password-input" 
            placeholder="Enter password..." 
            value={password} 
            onChange={handleInputChange} 
          />
          <button className="reveal-button" onClick={handleRevealSecret}>Reveal</button>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      ) : (
        <div className="secret-message">
          <h2 className="secret-title">You Have Unlocked the Secret!</h2>
          <p className="secret-content">The secret is... <strong>You are destined for greatness.</strong></p>
        </div>
      )}
    </div>
  );
};

export default Secret;