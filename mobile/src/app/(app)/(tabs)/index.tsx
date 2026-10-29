import AdminOverview from '../../../screens/AdminOverview';
import HostDashboard from '../../../screens/HostDashboard';
import TenantHome from '../../../screens/TenantHome';
import { useAuth } from '../../../lib/auth';

/** Same tab, three homes: renters search, landlords and agents manage listings, admins moderate. */
export default function Index() {
  const { user } = useAuth();
  if (user?.role === 'tenant') return <TenantHome />;
  return user?.role === 'admin' ? <AdminOverview /> : <HostDashboard />;
}
