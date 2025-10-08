import { Link } from 'react-router-dom';
import { useBodyClass } from '../hooks/useBodyClass.js';
import './about.css';

export function About() {
  useBodyClass('about-page');

  return (
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
  );
}
