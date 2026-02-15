import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

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
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import TaskTypes from './pages/TaskTypes';
import TimeEntries from './pages/TimeEntries';
import Reports from './pages/Reports';
import PortfolioAdmin from './pages/PortfolioAdmin';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';

function App() {
  const { isLoading } = useAuth0();

  // Set up Auth0 token for API requests
  useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
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
        path="/clients"
        element={
          <Layout>
            <ProtectedRoute>
              <Clients />
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
              <TaskTypes />
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
              <Reports />
            </ProtectedRoute>
          </Layout>
        }
      />
      <Route
        path="/portfolio-admin"
        element={
          <Layout>
            <ProtectedRoute>
              <PortfolioAdmin />
            </ProtectedRoute>
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
