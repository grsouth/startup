import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/base.css';
import { Login } from './login/Login.jsx';
import { Dashboard } from './dashboard/Dashboard.jsx';
import { About } from './about/About.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
