import React, { useState } from 'react';
import './puzzle-shared.css';

const Puzzle1Page = () => {
  // State for the 3x3 grid and hint visibility
  const [grid, setGrid] = useState(Array(3).fill().map(() => Array(3).fill('')));
  const [hint, setHint] = useState('');
  const [isHintRevealed, setIsHintRevealed] = useState(false);

  // List of possible correct configurations
// List of possible correct configurations
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


  // Handle input change for each cell
  const handleInputChange = (row, col, value) => {
    if (/^[0-9]?$/.test(value)) { // Allow only single-digit numbers (0-9)
      const newGrid = [...grid];
      newGrid[row][col] = value;
      setGrid(newGrid);
    }
  };

  // Check if the user's current grid matches any valid configuration
  const checkForValidConfiguration = () => {
    // Convert user input from strings to numbers, treating empty cells as NaN
    const userGrid = grid.map(row => row.map(cell => parseInt(cell) || NaN));

    // Loop through each valid configuration to see if one matches
    const isMatch = validConfigurations.some(config =>
      config.every((row, rowIndex) =>
        row.every((value, colIndex) => value === userGrid[rowIndex][colIndex])
      )
    );

    if (isMatch && !isHintRevealed) {
      revealHint();
    } else {
      alert('Incorrect configuration. Please try again.');
    }
  };

  // Reveal the hint when a valid configuration is found
  const revealHint = () => {
    setHint('The path you’ve uncovered is only one of many. Beware — symmetry is not always your ally.');
    setIsHintRevealed(true);
};

  // Reset the puzzle grid and hint
  const resetPuzzle = () => {
    setGrid(Array(3).fill().map(() => Array(3).fill('')));
    setHint('');
    setIsHintRevealed(false);
  };

  return (
    <div className="puzzle-container">
      <h1 className="puzzle-title">Puzzle 1</h1>
      <p className="instructions">
        <strong>Rule:</strong> Fill the 3x3 grid with single-digit numbers (0-9) such that the sum of every row, every column, and both diagonals equals <strong>15</strong>. There are multiple correct configurations.
      </p>

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

export default Puzzle1Page;
