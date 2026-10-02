import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUser } from '@/lib/auth';
import StudentClipboardGuard from '@/components/StudentClipboardGuard';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') && isAuthenticated() && !['admin','teacher'].includes(getUser()?.role)) return <Navigate to="/dashboard" replace />;
  if (getUser()?.role==='teacher' && ['/admin/teachers','/admin/calendar'].includes(location.pathname)) return <Navigate to="/admin/professor" replace/>;
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <StudentClipboardGuard>{children}</StudentClipboardGuard>;
};

export default ProtectedRoute;
