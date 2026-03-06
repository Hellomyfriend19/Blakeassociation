import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Terms } from './pages/Terms';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { Settings } from './pages/Settings';
import { Marketplace } from './pages/Marketplace';
import { Shop } from './pages/Shop';
import { QABoard } from './pages/QABoard';
import { QuestionDetails } from './pages/QuestionDetails';
import { Layout } from './components/Layout';
import { AuthService } from './services/auth';
import { User } from './types';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children?: React.ReactNode, requiredRole?: 'admin' | 'user' }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        console.log('Checking auth...');
        const currentUser = await AuthService.getCurrentUser();
        if (mounted) {
          console.log('User found:', currentUser);
          setUser(currentUser);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkAuth();
    
    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth check timed out');
        setLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blake-950 text-blake-200">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 border-2 border-blake-200 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-sm font-mono tracking-widest uppercase">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
     console.log('Insufficient permissions, redirecting to dashboard');
     return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            borderRadius: '0px',
            fontFamily: 'Inter, sans-serif'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms" element={<Terms />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="shop" element={<Shop />} />
          <Route path="qa" element={<QABoard />} />
          <Route path="qa/:id" element={<QuestionDetails />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;