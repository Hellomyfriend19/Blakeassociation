import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  LogOut, 
  Users, 
  ShoppingBag, 
  Crown,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { AuthService } from '../services/auth';
import { User } from '../types';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    AuthService.getCurrentUser().then(setUser);
  }, []);

  // Handle resize / orientation change
  useEffect(() => {
    const checkOrientation = () => {
      // Check if width is less than height (Portrait)
      setIsPortrait(window.innerWidth < window.innerHeight);
    };

    // Initial check
    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar when switching to landscape
  useEffect(() => {
    if (!isPortrait) {
      setIsSidebarOpen(false);
    }
  }, [isPortrait]);

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
      isActive 
        ? 'bg-blake-900 border-blake-200 text-blake-100' 
        : 'border-transparent text-blake-500 hover:text-blake-300 hover:bg-blake-900/50'
    }`;

  // Sidebar content component to avoid duplication
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-blake-950 border-r border-blake-800">
      {/* Header */}
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-blake-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blake-200" />
          <span className="font-bold tracking-widest uppercase">Blake</span>
        </div>
        {isPortrait && (
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-blake-500 hover:text-blake-300"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col gap-1 px-2">
          <NavLink to="/dashboard" className={navItemClass}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/marketplace" className={navItemClass}>
            <ShoppingBag size={18} />
            Marketplace
          </NavLink>
          <NavLink to="/qa" className={navItemClass}>
            <MessageSquare size={18} />
            Q&A Board
          </NavLink>
          <NavLink to="/shop" className={navItemClass}>
            <Crown size={18} />
            Prestige Shop
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navItemClass}>
              <Users size={18} />
              Admin Panel
            </NavLink>
          )}
          <NavLink to="/settings" className={navItemClass}>
            <SettingsIcon size={18} />
            Settings
          </NavLink>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-blake-800 flex-shrink-0">
        <div className="px-4 py-3 mb-2 rounded-lg bg-blake-900/30 border border-blake-800/50">
          <div className="text-xs text-blake-500 uppercase tracking-wider mb-1">User ID</div>
          <div className="font-mono text-xs text-blake-300 truncate">{user?.id || '...'}</div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 text-sm text-blake-500 hover:text-red-400 transition-colors w-full rounded-md hover:bg-blake-900/50"
        >
          <LogOut size={18} />
          Disconnect
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-blake-950 flex text-blake-200 font-sans overflow-hidden">
      
      {/* Portrait Header (Fixed) */}
      {isPortrait && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-blake-950/80 backdrop-blur-md border-b border-blake-800 z-30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-blake-400 hover:text-blake-200 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blake-200" />
              <span className="font-bold tracking-widest uppercase text-sm">Blake</span>
            </div>
          </div>
        </div>
      )}

      {/* Portrait Sidebar (Overlay) */}
      {isPortrait && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Drawer */}
          <aside 
            className={`fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Landscape Sidebar (Permanent) */}
      {!isPortrait && (
        <aside className="w-64 flex-shrink-0 h-screen sticky top-0">
          <SidebarContent />
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 min-w-0 overflow-auto h-screen ${isPortrait ? 'pt-16' : ''}`}>
        {/* Watermark - Landscape only */}
        {!isPortrait && (
          <div className="absolute top-4 right-6 text-blake-800 text-xs font-mono pointer-events-none select-none z-0 text-right">
            {new Date().toLocaleDateString()}
          </div>
        )}

        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto relative z-10">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
};
