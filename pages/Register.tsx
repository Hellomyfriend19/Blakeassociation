import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (pin.length !== 4) throw new Error("PIN must be 4 digits");
      
      await AuthService.register(username, password, pin);
      toast.success("Identity verified. Access granted.");
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
        <h2 className="text-xl font-light text-center text-white mb-8">New Member Registration</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Choose Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            className="bg-gray-800 border-gray-600 text-white"
          />
          
          <Input 
            label="Password" 
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />

          <Input 
            label="Set 4-Digit PIN" 
            type="password"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="••••"
            className="bg-gray-800 border-gray-600 text-white tracking-widest"
          />

          <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" isLoading={isLoading}>
            Create Identity
          </Button>
        </form>

        <div className="mt-6 text-center text-xs">
          <Link to="/login" className="text-gray-400 hover:text-white">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};