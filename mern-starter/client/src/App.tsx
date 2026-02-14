import { Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import TaskTypes from './pages/TaskTypes';
import TimeEntries from './pages/TimeEntries';
import Reports from './pages/Reports';
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
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-types"
          element={
            <ProtectedRoute>
              <TaskTypes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entries"
          element={
            <ProtectedRoute>
              <TimeEntries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
