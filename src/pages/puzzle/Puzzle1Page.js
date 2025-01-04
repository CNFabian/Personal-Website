import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './puzzle-shared.css';

const Puzzle1Page = () => {
  const [grid, setGrid] = useState(Array(3).fill().map(() => Array(3).fill('')));
  const [piece, setpiece] = useState('');
  const [ispieceRevealed, setIspieceRevealed] = useState(false);
  const [fadedNumbers, setFadedNumbers] = useState([]); // State to track which numbers have been entered
  
  const validConfigurations = [
    [
      [2, 7, 6],
      [9, 5, 1],
      [4, 3, 8]
    ],
    [
      [2, 9, 4],
      [7, 5, 3],
      [6, 1, 8]
    ],
    [
      [4, 3, 8],
      [9, 5, 1],
      [2, 7, 6]
    ],
    [
      [4, 9, 2],
      [3, 5, 7],
      [8, 1, 6]
    ],
    [
      [6, 1, 8],
      [7, 5, 3],
      [2, 9, 4]
    ],
    [
      [6, 7, 2],
      [1, 5, 9],
      [8, 3, 4]
    ],
    [
      [8, 1, 6],
      [3, 5, 7],
      [4, 9, 2]
    ],
    [
      [8, 3, 4],
      [1, 5, 9],
      [6, 7, 2]
    ]
  ];
  

  const handleInputChange = (row, col, value) => {
    if (/^[1-9]?$/.test(value)) { 
      const newGrid = [...grid];
      newGrid[row][col] = value;
      setGrid(newGrid);

      // Extract all the numbers currently in the grid
      const allNumbersInGrid = newGrid.flat().filter(val => val !== '');
      
      // Update faded numbers state to reflect only numbers currently in the grid
      setFadedNumbers(allNumbersInGrid);
    }
  };

  const checkForValidConfiguration = () => {
    const userGrid = grid.map(row => row.map(cell => parseInt(cell) || NaN));
  
    const isMatch = validConfigurations.some(config =>
      config.every((row, rowIndex) =>
        row.every((value, colIndex) => value === userGrid[rowIndex][colIndex])
      )
    );
  
    if (isMatch && !ispieceRevealed) {
      revealpiece(); // Show the piece
    } else {
      alert('Incorrect configuration. Please try again.');
      resetPuzzle(); // Only reset the grid if the configuration is incorrect
    }
  };
  
  const revealpiece = (index, pieceText) => {
    setpiece(pieceText);
    setIspieceRevealed(true);
    localStorage.setItem('piece1', 'The path you’ve uncovered is only one of many.'); // Puzzle 1 piece
    
    // Only set countdown start time if it's not already running
    const existingStartTime = localStorage.getItem('countdownStartTime');
    if (!existingStartTime) {
      const startTime = Date.now();
      localStorage.setItem('countdownStartTime', startTime.toString()); // Set countdown start time
      localStorage.setItem('countdownTime', '600'); // Store countdown duration (600 seconds = 10 min)
    }
  
  };

  const resetPuzzle = () => {
    setGrid(Array(3).fill().map(() => Array(3).fill('')));
    setpiece('');
    setIspieceRevealed(false);
    setFadedNumbers([]);
  };

  return (
    <div className="puzzle-container">
      <h1 className="puzzle-title">
        Puzzle 1
        <Link to="/puzzle2" className="next-icon">&gt;</Link>
        </h1>
      <p className="instructions">
        <strong>Rule:</strong> Fill the 3x3 grid with single-digit numbers (1-9) such that the sum of every row, 
        every column, and both diagonals equals <strong>15</strong>. There are multiple correct configurations.
      </p>

      <div className="number-row">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <span 
            key={num} 
            className={`number ${fadedNumbers.includes(num.toString()) ? 'flicker-out' : 'glow-up'}`}
          >
            {num}
          </span>
        ))}
      </div>

      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="row">
            {row.map((cell, colIndex) => (
              <input
                key={`cell-${rowIndex}-${colIndex}`}
                type="text"
                className="cell"
                value={cell}
                maxLength="1"
                onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>

      <button className="submit-button" onClick={checkForValidConfiguration}>Submit</button>

      {ispieceRevealed && (
        <div className="piece">
          <h2>Piece Revealed</h2>
          <p>{piece}</p>
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

export default Puzzle1Page;
