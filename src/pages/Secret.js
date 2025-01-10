import React, { useState, useRef, useEffect } from 'react';
import './Secret.css';

const Secret = () => {
  const [password, setPassword] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false); 
  const [isFlashing, setIsFlashing] = useState(false); 
  const [isFlashingError, setIsFlashingError] = useState(false); 
  const [pieces, setPieces] = useState(['???', '???', '???']);
  const [hasRevealedPiece, setHasRevealedPiece] = useState(false);
  const [countdownTime, setCountdownTime] = useState(1800); 
  const [flickerStyle, setFlickerStyle] = useState({ color: '#ff0000', textShadow: '0px 0px 30px #ff0000' });
  const inputRef = useRef(null);
  const correctPasswords = ['tacosking0', 'TacosKing0', 'tacosKing0', 'Tacosking0']; 
  let countdownTimer = useRef(null);

 
  const handleInputChange = (e) => setPassword(e.target.value);

  const handleRevealSecret = () => {
    if (correctPasswords.includes(password)) {
      setIsRevealed(true);
      setErrorMessage('');
    } else {
      setErrorMessage('Incorrect password. Try again.');
      setPassword('');
      setIsShaking(true);
      setIsFlashing(true);
      setIsFlashingError(true);
      inputRef.current.focus();

      setTimeout(() => setIsShaking(false), 1500);
      setTimeout(() => setIsFlashing(false), 1500);
      setTimeout(() => setIsFlashingError(false), 3000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRevealSecret(); 
    }
  };

  useEffect(() => {
    const storedPieces = [
      localStorage.getItem('piece1') || '???',
      localStorage.getItem('piece2') || '???',
      localStorage.getItem('piece3') || '???'
    ];
    setPieces(storedPieces);
  }, []);

  useEffect(() => {
    const storedStartTime = localStorage.getItem('countdownStartTime');
    const totalCountdownDuration = 1800; // Total countdown time in seconds
  
    if (storedStartTime) {
      const elapsedTime = Math.floor((Date.now() - parseInt(storedStartTime, 10)) / 1000);
      const remainingTime = Math.max(totalCountdownDuration - elapsedTime, 0);
  
      if (remainingTime > 0) {
        setCountdownTime(remainingTime);
        setHasRevealedPiece(true);
      } else {
        clearPiecesAndCountdown(); // Timer has expired
      }
    }
  }, []);
  
  

  useEffect(() => {
    if (hasRevealedPiece) {
      countdownTimer.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          if (prevTime <= 1) {
            clearPiecesAndCountdown();
            return 0;
          }
          const newTime = prevTime - 1;
          localStorage.setItem('countdownTime', newTime);
          return newTime;
        });
      }, 1000);
  
      return () => clearInterval(countdownTimer.current); // Cleanup
    }
  }, [hasRevealedPiece]);

  const clearPiecesAndCountdown = () => {
    clearInterval(countdownTimer.current);
    localStorage.removeItem('piece1');
    localStorage.removeItem('piece2');
    localStorage.removeItem('piece3');
    localStorage.removeItem('countdownStartTime');
    localStorage.removeItem('countdownTime');
    setPieces(['???', '???', '???']);
    setHasRevealedPiece(false);
    setCountdownTime(1800);
  };

  const revealPiece = (index, pieceText) => {
    const updatedPieces = [...pieces];
    updatedPieces[index] = pieceText;
    setPieces(updatedPieces);
    localStorage.setItem(`piece${index + 1}`, pieceText);
  
    // Set or update the countdown start time
    const existingStartTime = localStorage.getItem('countdownStartTime');
    if (!existingStartTime) {
      const startTime = Date.now();
      localStorage.setItem('countdownStartTime', startTime.toString());
      localStorage.setItem('countdownTime', '1800');
      setCountdownTime(1800);
    }
  
    setHasRevealedPiece(true);
  
    // Clear and restart the countdown timer
    clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      setCountdownTime((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          clearPiecesAndCountdown();
          return 0;
        }
        localStorage.setItem('countdownTime', newTime);
        return newTime;
      });
    }, 1000);
  };
  
  

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
<div className={`secret-container ${isFlashing ? 'flash' : ''}`}>
  {!isRevealed && (
    <>
      <h1 className="ominous-title" style={flickerStyle}>
        The Secret Awaits...
      </h1>
      {/* Countdown Timer or Placeholder */}
      <div className={`countdown-timer ${hasRevealedPiece ? 'visible' : 'hidden'}`}>
        {hasRevealedPiece && <p>Time Remaining: {formatTime(countdownTime)}</p>}
      </div>
      <div className={`password-box ${isShaking ? 'shake' : ''}`}>
        <p className="ominous-instructions">Enter the password to reveal the secret:</p>
        <input 
          type="password" 
          className="password-input" 
          placeholder="Enter password..." 
          value={password} 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown} 
          ref={inputRef} 
        />
        <p className="ominous-list">Connect all pieces with no spaces in between</p>
        <button className="reveal-button" onClick={handleRevealSecret}>
          Reveal
        </button>
        <div className={`error-message ${isFlashingError ? 'flash-error' : ''}`}>
          <p>{errorMessage}</p>
        </div>
      </div>
      <div className="pieces-container">
        <h2>Puzzle Pieces</h2>
        {pieces.map((piece, index) => (
          <p key={index}>Piece {index + 1}: {piece}</p>
        ))}
        <div className="warning-message">
          <p>Warning: Pieces will be cleared automatically after 30 minutes.</p>
        </div>
      </div>
      <a className="puzzle-link" href="/puzzle1">Solve Puzzle 1</a>
      <a className="puzzle-link" href="/puzzle2">Solve Puzzle 2</a>
      <a className="puzzle-link" href="/puzzle3">Solve Puzzle 3</a>
    </>
  )}
  {isRevealed && (
    <div className="secret-message">
      <h2 className="secret-title">You Have Unlocked the Secret!</h2>
      <p>
        <a 
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
          target="_blank" 
          rel="noopener noreferrer"
          className="prize-link"
        >
          Claim your prize
        </a>
      </p>
    </div>
  )}
</div>
  );
};

export default Secret;
