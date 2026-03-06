import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Login component mounted');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (usePin) {
        await AuthService.login(username, undefined, pin);
      } else {
        await AuthService.login(username, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 p-8 rounded-lg shadow-xl relative z-10">
        
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 bg-black border border-gray-600 flex items-center justify-center rounded-sm">
            <Shield className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-light text-center text-white mb-2">Blake Association</h2>
        <p className="text-center text-gray-400 text-sm mb-8 font-mono">Secure Access Terminal</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="Enter ID"
            className="bg-gray-800 border-gray-600 text-white"
          />
          
          {usePin ? (
            <Input 
              label="4-Digit PIN" 
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              className="tracking-widest bg-gray-800 border-gray-600 text-white"
            />
          ) : (
            <Input 
              label="Password" 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-gray-800 border-gray-600 text-white"
            />
          )}

          <div className="flex items-center justify-between text-xs">
            <button 
              type="button" 
              onClick={() => setUsePin(!usePin)}
              className="text-gray-400 hover:text-white transition-colors underline"
            >
              {usePin ? 'Use Password' : 'Use Quick PIN'}
            </button>
          </div>

          <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" isLoading={isLoading}>
            {usePin ? 'Verify PIN' : 'Authenticate'}
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500">
          <span className="mr-2">Restricted Access.</span>
          <Link to="/register" className="text-gray-400 hover:text-white">Request Invite (Register)</Link>
          <div className="mt-2">
            <Link to="/terms" className="text-gray-600 hover:text-gray-400 underline">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </div>
  );
};