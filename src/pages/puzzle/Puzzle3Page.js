import React, { useState } from 'react';
import './puzzle-shared.css'; // Import shared CSS file
import { Link } from 'react-router-dom';

const Puzzle3Page = () => {
  const [input, setInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const checkPassword = () => {
    if (input.toLowerCase() === 'hidden') {
      localStorage.setItem('piece3', 'Secret Code (Fill in Later');
      setIsCorrect(true);
      const existingStartTime = localStorage.getItem('countdownStartTime');
      if (!existingStartTime) {
        const startTime = Date.now();
        localStorage.setItem('countdownStartTime', startTime.toString()); // Set countdown start time
        localStorage.setItem('countdownTime', '600'); // Store countdown duration (600 seconds = 10 min)
      }
    } else {
      alert('Incorrect code. Try again.');
    }
  };

  return (
    <div
    className="puzzle-container"
    style={{ paddingBottom: '230px' }}
  >
    <h1 className="puzzle-title">
      <Link to="/puzzle2" className="back-icon">&lt;</Link>
      Puzzle 3
    </h1>

    <p className="instructions">
      Enter the code to receive the final piece.

      <br />

      Hint: I tend to double type some characters. Take a closer look and learn {' '}
            <Link to="/about" style={{ color: '#ff5555', textDecoration: 'underline' }}>
              About Me
            </Link>.
    </p>

    {/* Input Box and Submit Button */}
    <input
      type="text"
      className="cell"
      value={input}
      onChange={handleInputChange}
      placeholder="Enter Code"
      style={{
        width: '400px',
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '1.5rem',
      }}
    />
    <button className="submit-button" onClick={checkPassword}>
      Submit
    </button>
        {/* Display Visible piece Above the Input */}
        {isCorrect && (
      <div className="piece">
        <h2>Piece is Revealed</h2>
      </div>
    )}

        <p className='secret-page-link'>
          <Link
            to="/secret"
          >
            Go to the Secret Page
          </Link>
        </p>
  </div>
  );
};

export default Puzzle3Page;