import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/_pm.scss';

const PM_API = `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'}/api/pm`;

const PMLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${PM_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('pm_auth_token', data.token);
        navigate('/pm');
      } else {
        setError('Invalid password.');
        setPassword('');
      }
    } catch {
      setError('Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-login">
      <form className="pm-login__form" onSubmit={handleSubmit}>
        <h1 className="pm-login__title">PM Dashboard</h1>
        <input
          type="password"
          className="pm-login__input"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        {error && <p className="pm-login__error">{error}</p>}
        <button className="pm-login__btn" type="submit" disabled={loading}>
          {loading ? 'Authenticating...' : 'Enter'}
        </button>
      </form>
    </div>
  );
};

export default PMLogin;
