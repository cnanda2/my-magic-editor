import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import ProtectedRoute from './components/ProtectedRoute';

function WhiteLabelRedirect() {
  const location = useLocation();
  return <Navigate to={`/white-label${location.search}`} replace />;
}
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import UserDirectory from './pages/UserDirectory';
import UserDetail from './pages/UserDetail';
import RolesPermissions from './pages/RolesPermissions';
import AuditLog from './pages/AuditLog';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import BlockEditor from './pages/BlockEditor';
import Firmware from './pages/Firmware';
import Settings from './pages/Settings';
import DesignSettings from './pages/DesignSettings';
import WhiteLabelOnboarding from './pages/WhiteLabelOnboarding';
import Documentation from './pages/Documentation';
import Billing from './pages/Billing';
import Pricing from './pages/Pricing';
import PartnerSignup from './pages/PartnerSignup';

// Admin-only guard: redirects non-admins away from management pages.
function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function SuperAdminRoute({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'Super Admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function BrandingRoute({ children }) {
  const { user } = useAuth();
  // Pricing/Billing only - white-labeling itself is Super Admin-exclusive (see SuperAdminRoute)
  if (!user || !['Super Admin', 'Tenant Admin'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrandProvider>
      <div className="min-h-screen bg-bg-off-white text-on-surface">
        <Toaster position="top-right" />
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/partner-signup" element={<PartnerSignup />} />
          <Route
            element={<ProtectedRoute><BrandingRoute><Pricing /></BrandingRoute></ProtectedRoute>}
            path="/pricing"
          />

          {/* Protected user-management + admin */}
          <Route
            element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>}
            path="/dashboard"
          />
          <Route
            element={<ProtectedRoute><AdminRoute><UserDirectory /></AdminRoute></ProtectedRoute>}
            path="/users"
          />
          <Route
            element={<ProtectedRoute><AdminRoute><UserDetail /></AdminRoute></ProtectedRoute>}
            path="/users/:id"
          />
          <Route
            element={<ProtectedRoute><AdminRoute><RolesPermissions /></AdminRoute></ProtectedRoute>}
            path="/roles"
          />
          <Route
            element={<ProtectedRoute><AdminRoute><AuditLog /></AdminRoute></ProtectedRoute>}
            path="/audit"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><Tenants /></SuperAdminRoute></ProtectedRoute>}
            path="/tenants"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><TenantDetail /></SuperAdminRoute></ProtectedRoute>}
            path="/tenants/:id"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><WhiteLabelRedirect /></SuperAdminRoute></ProtectedRoute>}
            path="/design"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><WhiteLabelOnboarding /></SuperAdminRoute></ProtectedRoute>}
            path="/white-label"
          />
          <Route
            element={<ProtectedRoute><BrandingRoute><Billing /></BrandingRoute></ProtectedRoute>}
            path="/billing"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><Documentation /></SuperAdminRoute></ProtectedRoute>}
            path="/docs/:id"
          />
          <Route
            element={<ProtectedRoute><SuperAdminRoute><Documentation /></SuperAdminRoute></ProtectedRoute>}
            path="/docs"
          />

          {/* Admin settings */}
          <Route
            element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>}
            path="/settings"
          />

          {/* Legacy hardware-blocks dashboard (kept) */}
          <Route element={<Dashboard />} path="/" />
          <Route element={<Devices />} path="/devices" />
          <Route element={<BlockEditor />} path="/blocks" />
          <Route element={<Firmware />} path="/firmware" />
          <Route element={<div className="p-6"><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>} path="/admin" />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </div>
      </BrandProvider>
    </AuthProvider>
  );
}

export default App;
