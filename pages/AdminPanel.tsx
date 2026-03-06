import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { Button } from '../components/Button';
import toast from 'react-hot-toast';
import { Search, Coins, AlertTriangle, Eye, EyeOff, Ban, CheckCircle } from 'lucide-react';
import { Input } from '../components/Input';
import { AuthService } from '../services/auth';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);

  const fetchUsers = async () => {
    try {
      const allUsers = await db.getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustmentAmount) return;
    
    // In the new API, the backend determines the admin based on the token
    const adminId = 'self'; 
    
    try {
      await db.adminAdjustBalance(adminId, selectedUser.id, parseFloat(adjustmentAmount));
      toast.success(`Updated balance for ${selectedUser.username}`);
      setAdjustmentAmount('');
      setSelectedUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleBan = async () => {
    if (!selectedUser) return;
    const action = selectedUser.is_banned ? 'Unban' : 'Ban';
    if (!confirm(`Are you sure you want to ${action} ${selectedUser.username}?`)) return;

    try {
      const res = await db.adminBanUser(selectedUser.id);
      toast.success(res.message);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_banned: res.is_banned } : u));
      setSelectedUser(prev => prev ? { ...prev, is_banned: res.is_banned } : null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end border-b border-blake-800 pb-6">
        <div>
          <h1 className="text-2xl text-white font-light">Administration</h1>
          <p className="text-blake-500 text-sm mt-1">System oversight and currency control.</p>
        </div>
        <div className="flex gap-4 items-end">
          <Button 
            variant="secondary" 
            onClick={() => setShowCredentials(!showCredentials)}
            className="h-[38px] flex items-center gap-2"
          >
            {showCredentials ? <EyeOff size={14}/> : <Eye size={14}/>}
            {showCredentials ? 'Hide Hashes' : 'Show Hashes'}
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blake-600" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="bg-blake-900 border border-blake-800 text-sm pl-10 pr-4 py-2 rounded-none focus:outline-none focus:border-blake-500 text-blake-200 w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2 border border-blake-800 bg-blake-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-blake-900 text-blake-500 font-mono text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  {showCredentials && (
                    <>
                      <th className="px-6 py-3 text-red-400">Pass Hash</th>
                      <th className="px-6 py-3 text-red-400">PIN Hash</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-right">Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blake-800">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-blake-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{u.username}</div>
                      <div className="text-xs text-blake-600 font-mono">{u.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 border ${u.role === 'admin' ? 'border-purple-900 text-purple-400' : 'border-blake-700 text-blake-400'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    {showCredentials && (
                      <>
                        <td className="px-6 py-4 font-mono text-xs text-red-300/70 truncate max-w-[100px] hover:max-w-none transition-all cursor-help" title="Encrypted Hash">
                          {(u as any).password_hash || '****'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-red-300/70 truncate max-w-[100px]">
                          {(u as any).pin_hash || '****'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-right font-mono text-white">
                      {u.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_banned ? (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-mono uppercase">
                          <Ban size={12} /> Banned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-500 text-xs font-mono uppercase">
                          <CheckCircle size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="text-xs text-blake-400 hover:text-white underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="border border-blake-700 bg-blake-900/20 p-6 sticky top-6">
              <h3 className="text-lg text-white mb-4 border-b border-blake-800 pb-2 flex justify-between">
                <span>Manage: <span className="text-emerald-500">{selectedUser.username}</span></span>
                {selectedUser.is_banned ? <Ban className="text-red-500" /> : null}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blake-950 p-4 border border-blake-800 mb-4">
                  <div className="text-xs text-blake-500 uppercase">Current Balance</div>
                  <div className="text-2xl font-mono text-white">{selectedUser.balance.toFixed(2)}</div>
                </div>

                <div className="space-y-2">
                  <Input 
                    label="Adjust Amount (+/-)" 
                    type="number"
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(e.target.value)}
                    placeholder="-10 or 50"
                  />
                  <p className="text-xs text-blake-500">
                    Enter positive value to add funds, negative to deduct.
                  </p>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button onClick={handleAdjustBalance} className="flex-1">
                    <Coins size={16} className="inline mr-2" />
                    Execute
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedUser(null)}>
                    Cancel
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-blake-800">
                   <h4 className="text-xs uppercase text-red-500 mb-2 flex items-center gap-2">
                     <AlertTriangle size={14} /> Danger Zone
                   </h4>
                   <Button 
                      variant="danger" 
                      className="w-full text-xs"
                      onClick={handleToggleBan}
                   >
                     {selectedUser.is_banned ? 'Revoke Ban' : 'Ban User'}
                   </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-blake-800 p-8 text-center text-blake-600 text-sm">
              Select a user to manage their account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};