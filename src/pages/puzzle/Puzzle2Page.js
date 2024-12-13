import React, { useState } from 'react';

const Puzzle2Page = () => {
  const [userAnswer, setUserAnswer] = useState('');
  const [message, setMessage] = useState('');

  const correctAnswer = 'time'; // Example puzzle solution

  const handleInputChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const handleSubmit = () => {
    if (userAnswer.toLowerCase() === correctAnswer) {
      localStorage.setItem('hint2', 'Time waits for no one'); // Store the hint
      setMessage('Correct! The hint has been unlocked.');
    } else {
      setMessage('Incorrect answer. Try again.');
    }
  };

  return (
    <div className="puzzle-container">
      <h1>Puzzle 2</h1>
      <p>What flies without wings?</p>
      <input 
        type="text" 
        placeholder="Enter your answer..." 
        value={userAnswer} 
        onChange={handleInputChange} 
      />
      <button onClick={handleSubmit}>Submit</button>
      {message && <p>{message}</p>}
      <a href="/">Back to Main Page</a>
    </div>
  );
};

export default Puzzle2Page;
