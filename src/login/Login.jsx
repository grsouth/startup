import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { AuthStatus, useAuth } from '../auth/AuthContext.jsx';
import './login.css';

const MODES = {
  LOGIN: 'login',
  REGISTER: 'register'
};

export function Login() {
  useBodyClass('login-page');
  const navigate = useNavigate();
  const { status, login, register, error, clearError } = useAuth();

  const [mode, setMode] = useState(MODES.LOGIN);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    if (status === AuthStatus.AUTHENTICATED) {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const toggleMode = () => {
    setMode((previous) =>
      previous === MODES.LOGIN ? MODES.REGISTER : MODES.LOGIN
    );
    setFormError('');
    clearError();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
    if (formError) {
      setFormError('');
    }
    if (error) {
      clearError();
    }
  };

  const credentials = useMemo(
    () => ({
      username: form.username.trim(),
      password: form.password
    }),
    [form.username, form.password]
  );

  const canSubmit = credentials.username && credentials.password && !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!credentials.username || !credentials.password) {
      setFormError('Enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    clearError();

    try {
      if (mode === MODES.REGISTER) {
        await register(credentials);
      } else {
        await login(credentials);
      }
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setFormError(submitError.message || 'Unable to authenticate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const headingText =
    mode === MODES.LOGIN ? 'Welcome back' : 'Create your account';

  const submitText = mode === MODES.LOGIN ? 'Sign In' : 'Register';

  return (
    <>
      <main className="login-content">
        <h1>{headingText}</h1>
        <p className="login-subtitle">
          {mode === MODES.LOGIN
            ? 'Use your dashboard credentials to continue.'
            : 'Pick a username and password to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username" className="login-label">
            Username
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </label>

          <label htmlFor="password" className="login-label">
            Password
            <input
              type="password"
              id="password"
              name="password"
              autoComplete={mode === MODES.LOGIN ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </label>

          {formError ? (
            <p className="login-error" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Working…' : submitText}
          </button>
        </form>

        <button
          type="button"
          className="login-mode-toggle"
          onClick={toggleMode}
          disabled={isSubmitting}
        >
          {mode === MODES.LOGIN
            ? "Need an account? Register instead."
            : 'Already have an account? Sign in.'}
        </button>

        {status === AuthStatus.LOADING && (
          <p className="login-status" role="status">
            Checking your session…
          </p>
        )}

        <p className="login-meta">
          View the source on{' '}
          <a href="https://github.com/grsouth/startup">GitHub</a>.
        </p>
      </main>

      <SiteFooter>
        <p>
          | <Link to="/about">About</Link> |
        </p>
      </SiteFooter>
    </>
  );
}
