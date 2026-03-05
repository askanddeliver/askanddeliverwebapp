import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

// Context
import { ApiAuthProvider } from './contexts/ApiAuthContext';
import { UserProvider } from './contexts/UserContext';

// Layouts
import Layout from './components/Layout';
import PublicLayout from './components/public/PublicLayout';

// Public Pages
import Home from './pages/Home';
import Work from './pages/Work';
import WorkDetail from './pages/WorkDetail';
import About from './pages/About';
import Contact from './pages/Contact';

// Admin Pages (Protected)
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Users from './pages/Users';
import Projects from './pages/Projects';
import TaskTypes from './pages/TaskTypes';
import TimeEntries from './pages/TimeEntries';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import PortfolioAdmin from './pages/PortfolioAdmin';
import SiteConfig from './pages/SiteConfig';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Loading from './components/Loading';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
    <ScrollToTop />
    <ApiAuthProvider>
    <UserProvider>
    <Routes>
      {/* ============================================
          PUBLIC ROUTES — PublicLayout (brand site)
          ============================================ */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        }
      />
      <Route
        path="/work"
        element={
          <PublicLayout>
            <Work />
          </PublicLayout>
        }
      />
      <Route
        path="/work/:slug"
        element={
          <PublicLayout>
            <WorkDetail />
          </PublicLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PublicLayout>
            <About />
          </PublicLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicLayout>
            <Contact />
          </PublicLayout>
        }
      />

      {/* ============================================
          ADMIN ROUTES — Admin Layout (protected)
          ============================================ */}
      <Route
        path="/dashboard"
        element={
          <Layout>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/profile"
        element={
          <Layout>
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/leads"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <Leads />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/clients"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <Clients />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/projects"
        element={
          <Layout>
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/task-types"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <TaskTypes />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/entries"
        element={
          <Layout>
            <ProtectedRoute>
              <TimeEntries />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/reports"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <Reports />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/invoices"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <Invoices />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/portfolio-admin"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <PortfolioAdmin />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/site-config"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <SiteConfig />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/users"
        element={
          <Layout>
            <ProtectedRoute>
              <AdminRoute>
                <Users />
              </AdminRoute>
            </ProtectedRoute>
          </Layout>
        }
      />
    </Routes>
    </UserProvider>
    </ApiAuthProvider>
    </>
  );
}

export default App;
