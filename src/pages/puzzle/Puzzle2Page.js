import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './puzzle-shared.scss';

const Puzzle2Page = () => {
  const [grid, setGrid] = useState([
    ['X', '', '', 'X'],
    ['', '', '', ''],
    ['X', '', '', 'X']
  ]);
  const [piece, setPiece] = useState('');
  const [isPieceRevealed, setIsPieceRevealed] = useState(false);
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
  
    if (isMatch && !isPieceRevealed) {
      revealPiece();
    } else {
      alert('Incorrect configuration. Please try again.');
      resetPuzzle(); // Reset the puzzle grid after checking the configuration
    }
  
   
  };
  
  const revealPiece = (index, pieceText) => {
    setPiece(pieceText);
    setIsPieceRevealed(true);
    localStorage.setItem('piece2', 'The last name of an author who\'s books are not read on a screen'); // Store the Piece

    // Only set countdown start time if it's not already running
    const existingStartTime = localStorage.getItem('countdownStartTime');
    if (!existingStartTime) {
      const startTime = Date.now();
      localStorage.setItem('countdownStartTime', startTime.toString()); // Set countdown start time
      localStorage.setItem('countdownTime', '1800'); // Store countdown duration (600 seconds = 10 min)
    }
};


  const resetPuzzle = () => {
    setGrid([
      ['X', '', '', 'X'],
      ['', '', '', ''],
      ['X', '', '', 'X']
    ]);
    setPiece('');
    setIsPieceRevealed(false);
    setFadedNumbers([]);
  };

  return (
    <div className="puzzle-container"
    style={{ paddingTop: '40px' }}
    >
      <h1 className="puzzle-title">
        <Link to="/puzzle1" className="back-icon">&lt;</Link>
        Puzzle 2
        <Link to="/puzzle3" className="next-icon">&gt;</Link>
        </h1>
      <p className="instructions">
        <strong>Rule:</strong> Fill the grid with single-digit numbers (1-8) such that consequtive numbers do not touch, (not even corners!)
        <br />
      <strong>
        Example: 1 cannot touch 2, and 5 cannot touch 4 or 6.
      </strong>
        <br />
        There are multiple correct configurations.
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

      <button className="submit-button" onClick={checkForValidConfiguration}>Submit</button>

      {isPieceRevealed && (
        <div className="piece">
          <h2>Piece Revealed</h2>
          <p>{piece}</p>
        </div>
      )}
      

      <p className='secret-page-link' 
      style={{ paddingBottom: '50px' }}
      >
                <Link
                  to="/secret"
                >
                  Go to the Secret Page
                </Link>
              </p>

    </div>
  );
};

export default Puzzle2Page;
