import React, { useState, useRef, useEffect } from 'react';
import './Secret.css';

const Secret = () => {
  const [password, setPassword] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false); 
  const [isFlashing, setIsFlashing] = useState(false); 
  const [isFlashingError, setIsFlashingError] = useState(false); 
  const [hints, setHints] = useState(['???', '???', '???']);
  const [hasRevealedHint, setHasRevealedHint] = useState(false); // New state to track if a hint has been revealed
  const [countdownTime, setCountdownTime] = useState(600); // 10 minutes in seconds (600s)
  const [flickerStyle, setFlickerStyle] = useState({ color: '#ff0000', textShadow: '0px 0px 30px #ff0000' });
  const inputRef = useRef(null);
  const correctPassword = 'open-sesame'; 
  let countdownTimer = useRef(null);

  const handleInputChange = (e) => {
    setPassword(e.target.value);
  };

  const handleRevealSecret = () => {
    if (password === correctPassword) {
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
    const storedHints = [
      localStorage.getItem('hint1') || '???',
      localStorage.getItem('hint2') || '???',
      localStorage.getItem('hint3') || '???'
    ];
    setHints(storedHints);
  }, []);

  useEffect(() => {
    const flickerEffect = () => {
      const randomChance = Math.random();
      if (randomChance < 0.1) {
        setFlickerStyle({ color: '#000', textShadow: '0px 0px 2px #000' });
      } else if (randomChance < 0.4) {
        setFlickerStyle({ color: '#8b0000', textShadow: '0px 0px 10px #8b0000' });
      } else if (randomChance < 0.7) {
        setFlickerStyle({ color: '#ff0000', textShadow: '0px 0px 30px #ff0000' });
      } else {
        setFlickerStyle({ color: '#ff0000', textShadow: '0px 0px 60px #ff0000' });
      }
    };

    const interval = setInterval(flickerEffect, Math.random() * 500 + 100); 
    return () => clearInterval(interval); 
  }, []);

  useEffect(() => {
    const storedStartTime = localStorage.getItem('countdownStartTime');
    const storedCountdownTime = parseInt(localStorage.getItem('countdownTime'), 10);

    if (storedStartTime && storedCountdownTime) {
      const timeElapsed = Math.floor((Date.now() - parseInt(storedStartTime)) / 1000);
      const remainingTime = storedCountdownTime - timeElapsed;
      if (remainingTime > 0) {
        setCountdownTime(remainingTime);
        setHasRevealedHint(true);
      } else {
        // Time expired, clear hints
        localStorage.removeItem('hint1');
        localStorage.removeItem('hint2');
        localStorage.removeItem('hint3');
        localStorage.removeItem('countdownStartTime');
        localStorage.removeItem('countdownTime');
        setHints(['???', '???', '???']);
      }
    }
  }, []);

  useEffect(() => {
    if (hasRevealedHint) {
      clearInterval(countdownTimer.current);
      let hasAlerted = false;

      countdownTimer.current = setInterval(() => {
        setCountdownTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(countdownTimer.current);
            localStorage.removeItem('hint1');
            localStorage.removeItem('hint2');
            localStorage.removeItem('hint3');
            localStorage.removeItem('countdownStartTime');
            localStorage.removeItem('countdownTime');
            setHints(['???', '???', '???']);
            setHasRevealedHint(false); 
            
            if (!hasAlerted) {
              alert('Hints have been cleared automatically!');
              hasAlerted = true;
            }
            return 0;
          }
          localStorage.setItem('countdownTime', prevTime - 1);
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(countdownTimer.current);
    }
  }, [hasRevealedHint]);
  

  const revealHint = (index, hintText) => {
    const updatedHints = [...hints];
    updatedHints[index] = hintText;
    setHints(updatedHints);
    localStorage.setItem(`hint${index + 1}`, hintText);

    if (!hasRevealedHint) {
      const startTime = Date.now();
      localStorage.setItem('countdownStartTime', startTime.toString());
      localStorage.setItem('countdownTime', '600');
      setHasRevealedHint(true);
      setCountdownTime(600);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`secret-container ${isFlashing ? 'flash' : ''}`}>
      <h1 className="ominous-title" style={flickerStyle}>
        The Secret Awaits...
      </h1>

      <div className={`countdown-timer ${hasRevealedHint ? 'visible' : 'hidden'}`}>
        {hasRevealedHint && <p>Time Remaining: {formatTime(countdownTime)}</p>}
      </div>
      {!isRevealed ? (
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
          <button 
            className="reveal-button" 
            onClick={handleRevealSecret}
          >
            Reveal
          </button>

          <div className={`error-message ${isFlashingError ? 'flash-error' : ''}`}>
            <p>{errorMessage}</p>
          </div>
        
        </div>
      ) : (
        <div className="secret-message">
          <h2 className="secret-title">You Have Unlocked the Secret!</h2>
          <p className="secret-content">The secret is... <strong>You are destined for greatness.</strong></p>
        </div>
      )}

      <div className="hints-container">
        <h2>Hints</h2>
        <p>Hint 1: {hints[0]}</p>
        <p>Hint 2: {hints[1]}</p>
        <p>Hint 3: {hints[2]}</p>

        <button onClick={() => revealHint(0, 'The first letter is O')}>Reveal Hint 1</button>
        <button onClick={() => revealHint(1, 'The second letter is P')}>Reveal Hint 2</button>
        <button onClick={() => revealHint(2, 'The third letter is E')}>Reveal Hint 3</button>

        <div className="warning-message">
          <p>Warning: Hints will be cleared automatically after 10 minutes.</p>
        </div>
      </div>        

      <a className="puzzle-link" href="/puzzle1">Solve Puzzle 1</a>
      <a className="puzzle-link" href="/puzzle2">Solve Puzzle 2</a>
      <a className="puzzle-link" href="/puzzle3">Solve Puzzle 3</a>
    </div>
  );
};

export default Secret;
