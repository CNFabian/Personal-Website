import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './puzzle-shared.css';

const Puzzle2Page = () => {
  const [grid, setGrid] = useState([
    ['X', '', '', 'X'],
    ['', '', '', ''],
    ['X', '', '', 'X']
  ]);
  const [hint, setHint] = useState('');
  const [isHintRevealed, setIsHintRevealed] = useState(false);
  const [fadedNumbers, setFadedNumbers] = useState([]); // State to track which numbers have been entered

  const validConfigurations = [
    [
      ['X', '4', '6', 'X'],
    ['7', '1', '8', '2'],
    ['X', '3', '5', 'X']
    ],
    [
      ['X', '3', '5', 'X'],
    ['7', '1', '8', '2'],
    ['X', '4', '6', 'X']
    ],
    [
      ['X', '6', '4', 'X'],
    ['2', '8', '1', '7'],
    ['X', '5', '3', 'X']
    ],
    [
      ['X', '5', '3', 'X'],
    ['2', '8', '1', '7'],
    ['X', '6', '4', 'X']
    ],
  ];

  const handleInputChange = (row, col, value) => {
    if (/^[1-9]?$/.test(value) && grid[row][col] !== null) { 
      const newGrid = [...grid];
      newGrid[row][col] = value;
      setGrid(newGrid);

      // Extract all the numbers currently in the grid
      const allNumbersInGrid = newGrid.flat().filter(val => val !== '' && val !== null);
      
      // Update faded numbers state to reflect only numbers currently in the grid
      setFadedNumbers(allNumbersInGrid);
    }
  };

  const checkForValidConfiguration = () => {
    const userGrid = grid.map(row => row.map(cell => (cell === '' ? '' : cell))); // Keep input as strings
  
    const isMatch = validConfigurations.some(config =>
      config.every((row, rowIndex) =>
        row.every((value, colIndex) => {
          // Skip 'X' cells in both grids
          if (value === 'X') return true; 
          return value === userGrid[rowIndex][colIndex];
        })
      )
    );
  
    if (isMatch && !isHintRevealed) {
      revealHint();
    } else {
      alert('Incorrect configuration. Please try again.');
      resetPuzzle(); // Reset the puzzle grid after checking the configuration
    }
  
   
  };
  
  const revealHint = (index, hintText) => {
    setHint(hintText);
    setIsHintRevealed(true);
    localStorage.setItem('hint2', 'The path you’ve uncovered is only one of many.'); // Store the hint

    // Only set countdown start time if it's not already running
    const existingStartTime = localStorage.getItem('countdownStartTime');
    if (!existingStartTime) {
      const startTime = Date.now();
      localStorage.setItem('countdownStartTime', startTime.toString()); // Set countdown start time
      localStorage.setItem('countdownTime', '600'); // Store countdown duration (600 seconds = 10 min)
    }
};


  const resetPuzzle = () => {
    setGrid([
      ['X', '', '', 'X'],
      ['', '', '', ''],
      ['X', '', '', 'X']
    ]);
    setHint('');
    setIsHintRevealed(false);
    setFadedNumbers([]);
  };

  return (
    <div className="puzzle-container">
      <h1 className="puzzle-title">
        <Link to="/puzzle1" className="back-icon">&lt;</Link>
        Puzzle 2
        <Link to="/puzzle3" className="next-icon">&gt;</Link>
        </h1>
      <p className="instructions">
        <strong>Rule:</strong> Fill the grid with single-digit numbers (1-9) according to the puzzle's rules. There are multiple correct configurations.
      </p>

      <div className="number-row">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
          <span 
            key={num} 
            className={`number ${fadedNumbers.includes(num.toString()) ? 'flicker-out' : 'glow-up'}`}
          >
            {num}
          </span>
        ))}
      </div>

      <div className="grid" style={{ marginBottom: '80px' }}>
        {grid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="row">
            {row.map((cell, colIndex) => (
              cell !== 'X' ? (
                <input
                  key={`cell-${rowIndex}-${colIndex}`}
                  type="text"
                  className="cell"
                  value={cell}
                  maxLength="1"
                  onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                />
              ) : (
                <div key={`empty-${rowIndex}-${colIndex}`} className="empty-cell"></div>
              )
            ))}
          </div>
        ))}
      </div>

      {isHintRevealed && (
        <div className="hint">
          <h2>Hint Revealed</h2>
          <p>{hint}</p>
        </div>
      )}

      <button className="submit-button" onClick={checkForValidConfiguration}>Submit</button>
    </div>
  );
};

export default Puzzle2Page;
