import { Navigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';

export function LoginPage() {
  return <Navigate to={ROUTES.HOME} replace />;
}
