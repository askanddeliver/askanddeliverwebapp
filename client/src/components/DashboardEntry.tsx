import { Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { useUserRole } from '../contexts/UserContext';
import Loading from './Loading';

/** Admin dashboard — members redirect to /member. */
function DashboardEntry() {
  const { isAdmin, isMember, isLoading } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  if (isMember && !isAdmin) {
    return <Navigate to="/member" replace />;
  }

  return <Dashboard />;
}

export default DashboardEntry;
