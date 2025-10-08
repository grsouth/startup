import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import './login.css';

export function Login() {
  useBodyClass('login-page');
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate('/dashboard');
  };

  return (
    <>
      <main className="login-content">
        <h1>Login</h1>
        <a href="https://github.com/grsouth/startup">My Repository</a>

        <form onSubmit={handleSubmit}>
          <p>
            <label htmlFor="username">Username:</label>
            <br />
            <input type="text" id="username" name="username" />
          </p>
          <p>
            <label htmlFor="password">Password:</label>
            <br />
            <input type="password" id="password" name="password" />
          </p>
          <p>
            <button type="submit">Login</button>
          </p>
        </form>
      </main>

      <SiteFooter>
        <p>
          | <Link to="/about">About</Link> |
        </p>
      </SiteFooter>
    </>
  );
}
