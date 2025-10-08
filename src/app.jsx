import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import './styles/base.css';
import './login/login.css';
import './dashboard/dashboard.css';
import './about/about.css';

function useBodyClass(className) {
  useEffect(() => {
    if (!className) {
      return undefined;
    }

    document.body.classList.add(className);

    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);
}

function SiteFooter({ children }) {
  return (
    <footer className="site-footer">
      <p>&copy; 2025 My Website</p>
      {children}
    </footer>
  );
}

function LoginPage() {
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

function AboutPage() {
  useBodyClass('about-page');

  return (
    <>
      <main className="about-content">
        <h1>About This Website</h1>

        <h2>Me</h2>
        <p>I am Garrett, and the following is a picture of my dog.</p>

        <img src="/fitzyPic.jpg" alt="Picture of my dog" width="300" />

        <p>
          Pretty cute right? <i>WRONG</i>. He stresses me out immensely.
        </p>
        <h2>Contact</h2>
        <p>
          If you’d like to reach me for some reason, my email is:{' '}
          <a href="mailto:garrettsoutham@proton.me">garrettsoutham@proton.me</a>
        </p>

        <p>
          <Link to="/">Back to Home</Link>
        </p>
      </main>
    </>
  );
}

function DashboardPage() {
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

        <section className="dashboard-card notebook-card">
          <h2 className="section-title">Notebook</h2>
          <p>
            <i>(database data placeholder)</i>
          </p>
          <textarea rows="6" cols="40" />
          <div className="notebook-actions">
            <input type="text" placeholder="Search" />
            <button type="button">Save</button>
          </div>
        </section>

        <section className="dashboard-card weather-card">
          <h2 className="section-title">Weather</h2>
          <p>
            [Weather Icon] <i>(placeholder for 3rd party service call)</i>
          </p>
          <label>
            Location: <input type="text" />
          </label>
          <label>
            Temp: <input type="text" />
          </label>
          <label>
            AQI: <input type="text" />
          </label>
        </section>

        <section className="dashboard-card todo-card">
          <h2 className="section-title">TODO</h2>
          <p>
            <i>(websocket/database data placeholder)</i>
          </p>
          <ul>
            <li>
              <input type="checkbox" /> Pet dog
            </li>
            <li>
              <input type="checkbox" /> Pet dog again
            </li>
            <li>
              <input type="checkbox" /> Feed dog
            </li>
          </ul>
          <div className="todo-actions">
            <input type="text" placeholder="New task" />
            <button type="button">Add</button>
          </div>
        </section>

        <section className="dashboard-card agenda-card">
          <h2 className="section-title">Agenda</h2>
          <p>
            <i>(websocket/database data placeholder)</i>
          </p>
          <ul>
            <li>9/29 9:29: Extremely Important Thing</li>
            <li>9/29 9:29: Extremely Important Thing</li>
            <li>9/29 9:29: Extremely Important Thing</li>
          </ul>
        </section>

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
