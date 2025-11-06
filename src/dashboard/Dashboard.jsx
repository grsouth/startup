import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { QuickLinks } from './components/QuickLinks.jsx';
import { Weather } from './components/Weather.jsx';
import { TodoList } from './components/TodoList.jsx';
import { Calendar } from './components/Calendar.jsx';
import { Notebook } from './components/Notebook.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import './dashboard.css';

export function Dashboard() {
  useBodyClass('dashboard-page');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
      navigate('/');
    }
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>My Dashboard</h1>
          <a href="https://github.com/grsouth/startup">My Repository</a>
        </div>
        <div className="dashboard-user">
          <p>
            Signed in as:{' '}
            <strong id="username">{user?.username ?? 'Unknown'}</strong>
          </p>
          <button
            type="button"
            id="logoutBtn"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <QuickLinks />
        <Weather />
        <TodoList />
        <Calendar />
        <Notebook />
      </main>

      <SiteFooter>
        <p>
          | <Link to="/about">About</Link> |
        </p>
        <p>
          | <a href="https://garrettsoutham.com">Back To Home</a> |
        </p>
      </SiteFooter>
    </>
  );
}
