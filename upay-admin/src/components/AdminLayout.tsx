'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import Link from 'next/link';
import { 
  LayoutGrid, 
  Building2, 
  Clock, 
  UserPlus,
  Landmark, 
  User as UserIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface AuthContextType {
  token: string | null;
  admin: User | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({ token: null, admin: null, signOut: () => {} });

export const useAuth = () => useContext(AuthContext);

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Start from the same empty state on the server and client, then restore the
  // browser-only session after hydration. Reading localStorage during render
  // made the client render a FluentProvider where the server rendered nothing.
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      const savedToken = localStorage.getItem('upay_admin_token');
      const savedUser = localStorage.getItem('upay_admin_user');
      setToken(savedToken);
      if (savedUser) {
        try {
          setAdmin(JSON.parse(savedUser) as User);
        } catch {
          localStorage.removeItem('upay_admin_user');
        }
      }
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!token) {
      router.push('/');
    }
  }, [router, sessionLoaded, token]);

  const signOut = () => {
    localStorage.removeItem('upay_admin_token');
    localStorage.removeItem('upay_admin_user');
    setToken(null);
    setAdmin(null);
    router.push('/');
  };

  if (!sessionLoaded || !token) return null;

  const initials = admin?.full_name 
    ? admin.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
    : 'CA';

  return (
    <FluentProvider theme={webLightTheme}>
      <AuthContext.Provider value={{ token, admin, signOut }}>
        <div className={`admin-canvas ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Left Sidebar */}
          <aside className="upay-sidebar">
            <div className="sidebar-brand">
              <div className="brand-logo-box">
                <Landmark size={22} color="#ffffff" />
              </div>
              {!collapsed && (
                <div className="brand-text-group">
                  <span className="brand-title">upay</span>
                  <span className="brand-subtitle">CORPORATE</span>
                </div>
              )}
            </div>
            
            <nav className="sidebar-nav">
              <Link 
                href="/dashboard" 
                className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
                title="Dashboard"
              >
                <LayoutGrid size={19} />
                {!collapsed && <span>Dashboard</span>}
              </Link>
              <Link 
                href="/companies" 
                className={`nav-item ${pathname === '/companies' ? 'active' : ''}`}
                title="Companies"
              >
                <Building2 size={19} />
                {!collapsed && <span>Companies</span>}
              </Link>
              <Link 
                href="/activity" 
                className={`nav-item ${pathname === '/activity' ? 'active' : ''}`}
                title="Activity"
              >
                <Clock size={19} />
                {!collapsed && <span>Activity</span>}
              </Link>
              <Link href="/registrations" className={`nav-item ${pathname === '/registrations' ? 'active' : ''}`} title="Employee registrations">
                <UserPlus size={19} />{!collapsed && <span>Registrations</span>}
              </Link>
            </nav>

            <div className="sidebar-footer">
              <div className="user-profile-widget" onClick={signOut} title="Click to Sign Out">
                <div className="user-avatar">{initials}</div>
                {!collapsed && (
                  <>
                    <div className="user-details">
                      <strong className="user-name">{admin?.full_name || 'Signed-in user'}</strong>
                      <span className="user-role">{admin?.role || 'Role unavailable'}</span>
                    </div>
                    <div className="user-arrow">
                      <ChevronRight size={16} />
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar Collapse Toggle */}
              <button 
                className="sidebar-collapse-btn" 
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <div className="collapse-icon-circle">
                  {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </div>
                {!collapsed && <span>Collapse</span>}
              </button>
            </div>
          </aside>
          
          {/* Main Workspace Area */}
          <main className="admin-workspace">
            {/* Top Bar Header */}
            <div className="workspace-header-bar">
              <div className="header-title-container">
                <h1 className="header-main-title">
                  {pathname === '/dashboard' && 'Portfolio Liquidity'}
                  {pathname === '/companies' && 'Corporate Directory'}
                  {pathname === '/activity' && 'Operations Activity'}
                  {pathname === '/registrations' && 'Employee Registrations'}
                </h1>
                <div className="header-yellow-line" />
              </div>
              
              <div className="header-actions">
                <button className="icon-badge-btn" aria-label="User Profile" title="Profile" onClick={signOut}>
                  <UserIcon size={20} />
                </button>
              </div>
            </div>

            {/* Page Content */}
            <div className="page-content-wrapper">
              {children}
            </div>
          </main>
        </div>
      </AuthContext.Provider>
    </FluentProvider>
  );
}
