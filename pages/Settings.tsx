import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { db } from '../services/db';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);

  // Password State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // PIN State
  const [authPass, setAuthPass] = useState('');
  const [newPin, setNewPin] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoadingPass(true);
    try {
      await db.updatePassword(oldPass, newPass);
      toast.success("Password updated successfully");
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingPass(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    setLoadingPin(true);
    try {
      await db.updatePin(authPass, newPin);
      toast.success("Quick Login PIN updated");
      setAuthPass('');
      setNewPin('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingPin(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-2xl text-white font-light border-b border-blake-800 pb-4">Settings</h1>
      
      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-lg text-blake-300 font-medium">Security</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4 border border-blake-800 p-6 bg-blake-900/10">
            <Input 
              label="Current Password" 
              type="password" 
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              placeholder="••••••••" 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Input 
                 label="New Password" 
                 type="password" 
                 value={newPass}
                 onChange={e => setNewPass(e.target.value)}
                 placeholder="••••••••" 
               />
               <Input 
                 label="Confirm New Password" 
                 type="password" 
                 value={confirmPass}
                 onChange={e => setConfirmPass(e.target.value)}
                 placeholder="••••••••" 
               />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" isLoading={loadingPass}>
                Update Password
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4 pt-6 border-t border-blake-900">
          <h3 className="text-lg text-blake-300 font-medium">Quick Login PIN</h3>
          <form onSubmit={handlePinChange} className="space-y-4 border border-blake-800 p-6 bg-blake-900/10">
            <p className="text-sm text-blake-500 mb-2">Use your main password to authorize a PIN change.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Current Password" 
                type="password" 
                value={authPass}
                onChange={e => setAuthPass(e.target.value)}
                placeholder="••••••••" 
              />
              <Input 
                label="New 4-Digit PIN" 
                type="password" 
                maxLength={4} 
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="••••" 
                className="tracking-widest"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" isLoading={loadingPin}>
                Set PIN
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4 pt-6 border-t border-blake-900 opacity-50">
           <h3 className="text-lg text-blake-300 font-medium">Appearance</h3>
           <p className="text-sm text-blake-500">Theme is locked to 'Blake Protocol' (Dark Mode).</p>
        </section>
      </div>
    </div>
  );
};