import React, { useState } from 'react';
import './puzzle-shared.css';

const Puzzle2Page = () => {
  // State for the 1x1 grid, 3x2 grid, and hint visibility
  const [topGrid, setTopGrid] = useState('');
  const [grid3x2, setGrid3x2] = useState(Array(2).fill().map(() => Array(3).fill('')));
  const [bottomGrid, setBottomGrid] = useState('');
  const [hint, setHint] = useState('');
  const [isHintRevealed, setIsHintRevealed] = useState(false);

  // Handle input change for the single cells
  const handleTopGridInputChange = (value) => {
    if (/^[0-9]?$/.test(value)) { // Allow only single-digit numbers (0-9)
      setTopGrid(value);
    }
  };

  const handleBottomGridInputChange = (value) => {
    if (/^[0-9]?$/.test(value)) { // Allow only single-digit numbers (0-9)
      setBottomGrid(value);
    }
  };

  // Handle input change for the 3x2 grid cells
  const handleGrid3x2InputChange = (row, col, value) => {
    if (/^[0-9]?$/.test(value)) { // Allow only single-digit numbers (0-9)
      const newGrid = [...grid3x2];
      newGrid[row][col] = value;
      setGrid3x2(newGrid);
    }
  };

  // Reset the puzzle grid and hint
  const resetPuzzle = () => {
    setTopGrid('');
    setGrid3x2(Array(2).fill().map(() => Array(3).fill('')));
    setBottomGrid('');
    setHint('');
    setIsHintRevealed(false);
  };

  // Submit button logic (acts as a reset button as well)
  const handleSubmit = () => {
    resetPuzzle();
  };

  return (
    <div className="puzzle-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="puzzle-title">Puzzle 2</h1>
        <p className="instructions">
          <strong>Rule:</strong> Fill the 1x1 grid, 3x2 grid, and another 1x1 grid according to the specific puzzle rules.
        </p>

        <div className="grid" style={{ display: 'flex', justifyContent: 'center' }}>
          <input
            type="text"
            className="cell"
            value={topGrid}
            maxLength="1"
            onChange={(e) => handleTopGridInputChange(e.target.value)}
          />
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gridTemplateRows: 'repeat(2, 60px)', justifyContent: 'center' }}>
          {grid3x2.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <input
                key={`cell-${rowIndex}-${colIndex}`}
                type="text"
                className="cell"
                value={cell}
                maxLength="1"
                onChange={(e) => handleGrid3x2InputChange(rowIndex, colIndex, e.target.value)}
              />
            ))
          ))}
        </div>

        <div className="grid" style={{ display: 'flex', justifyContent: 'center' }}>
          <input
            type="text"
            className="cell"
            value={bottomGrid}
            maxLength="1"
            onChange={(e) => handleBottomGridInputChange(e.target.value)}
          />
        </div>

        {isHintRevealed && (
          <div className="hint">
            <h2>Hint Revealed</h2>
            <p>{hint}</p>
          </div>
        )}

        <button className="submit-button" onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
};

export default Puzzle2Page;
