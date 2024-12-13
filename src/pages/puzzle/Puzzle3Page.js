import React, { useState } from 'react';

const Puzzle3Page = () => {
  const [userAnswer, setUserAnswer] = useState('');
  const [message, setMessage] = useState('');

  const correctAnswer = 'shadow'; // Example puzzle solution

  const handleInputChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const handleSubmit = () => {
    if (userAnswer.toLowerCase() === correctAnswer) {
      localStorage.setItem('hint3', 'It follows you everywhere'); // Store the hint
      setMessage('Correct! The hint has been unlocked.');
    } else {
      setMessage('Incorrect answer. Try again.');
    }
  };

  return (
    <div className="puzzle-container">
      <h1>Puzzle 3</h1>
      <p>The more of me there is, the less you see. What am I?</p>
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

export default Puzzle3Page;
