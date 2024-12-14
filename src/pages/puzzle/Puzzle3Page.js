import React, { useState } from 'react';
import './puzzle-shared.css'; // Import shared CSS file

const Puzzle3Page = () => {
  const [userAnswer, setUserAnswer] = useState('');
  const [message, setMessage] = useState('');
  const correctAnswer = '42'; // Example puzzle solution

  const handleInputChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const handleSubmit = () => {
    if (userAnswer === correctAnswer) {
      localStorage.setItem('hint1', 'The answer is life'); // Store the hint
      setMessage({ text: 'Correct! The hint has been unlocked.', type: 'success' });
    } else {
      setMessage({ text: 'Incorrect answer. Try again.', type: 'error' });
    }
  };

  return (
    <div className="puzzle-container">
      <h1 className="puzzle-title">Puzzle 3</h1>
      <p>What is the "Answer to the Ultimate Question of Life, the Universe, and Everything"?</p>

      <input 
        type="text" 
        placeholder="Enter your answer..." 
        value={userAnswer} 
        onChange={handleInputChange} 
        className="puzzle-input"
      />

      <button onClick={handleSubmit} className="submit-button">
        Submit
      </button>

      {message.text && (
        <p className={`feedback-message ${message.type}`}>
          {message.text}
        </p>
      )}

      <a href="/secret" className="back-link">Back to Secret Page</a>
    </div>
  );
};

export default Puzzle3Page;
