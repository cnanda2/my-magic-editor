import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards admin routes. Shows a loading state while the session is verified,
 * then redirects to /login if there is no authenticated user.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-off-white">
        <div className="flex items-center gap-3 text-deep-navy">
          <span className="material-symbols-outlined animate-spin text-stem-orange">progress_activity</span>
          <span className="font-medium">Verifying session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
