import { Navigate } from 'react-router-dom';
import { AuthStatus, useAuth } from './AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === AuthStatus.LOADING) {
    return (
      <main className="page-status">
        <p>Checking credentials…</p>
      </main>
    );
  }

  if (status !== AuthStatus.AUTHENTICATED) {
    return <Navigate to="/" replace />;
  }

  return children;
}
