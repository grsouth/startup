import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { Notebook } from './components/Notebook.jsx';
import { TodoList } from './components/TodoList.jsx';
import { Weather } from './components/Weather.jsx';
import './dashboard.css';

export function Dashboard() {
  useBodyClass('dashboard-page');
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
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
            Signed in as: <strong id="username">Guest</strong>
          </p>
          <button type="button" id="logoutBtn" onClick={handleLogout}>
            Switch User
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-card quick-links-card">
          <h2 className="section-title">Quick Links</h2>
          <nav className="quick-links">
            <ul className="quick-links-list">
              <li>
                <img src="https://github.com/favicon.ico" alt="" width="16" height="16" />
                <a href="https://github.com/grsouth">Github</a>
              </li>
              <li>
                <img src="http://jellyfin.local/favicon.ico" alt="" width="16" height="16" />
                <a href="http://jellyfin.local">Jellyfin</a>
              </li>
              <li>
                <img src="https://byu.instructure.com/favicon.ico" alt="" width="16" height="16" />
                <a href="https://byu.instructure.com">Canvas</a>
              </li>
              <li>
                <img src="https://aws.amazon.com/favicon.ico" alt="" width="16" height="16" />
                <a href="https://aws.amazon.com">AWS</a>
              </li>
              <li>
                <img src="https://mail.google.com/favicon.ico" alt="" width="16" height="16" />
                <a href="https://mail.google.com">Gmail</a>
              </li>
              <li>
                <img src="https://protonmail.com/favicon.ico" alt="" width="16" height="16" />
                <a href="https://protonmail.com">Proton Mail</a>
              </li>
            </ul>
          </nav>
        </section>

        <Notebook />

        <Weather />

        <TodoList />

        <section className="dashboard-card calendar-card">
          <h2 className="section-title">Calendar</h2>
          <p>[Calendar Placeholder]</p>
        </section>
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
