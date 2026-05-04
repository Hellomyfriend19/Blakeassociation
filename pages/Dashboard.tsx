import React, { useEffect, useState } from 'react';
import { User, Transaction } from '../types';
import { AuthService } from '../services/auth';
import { db } from '../services/db';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, CreditCard, Activity, Crown, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchData = async () => {
    try {
      const u = await AuthService.getCurrentUser();
      setUser(u);
      if (u) {
        const txs = await db.getTransactions(u.id);
        setTransactions(txs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setTransferLoading(true);
    try {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) throw new Error("Invalid amount");
      
      await db.transfer(user.id, recipient, val);
      toast.success("Points transferred successfully");
      setRecipient('');
      setAmount('');
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading || !user) return null;

  // Cosmetic Logic
  const isVip = user.vip_until && new Date(user.vip_until) > new Date();
  const nameColor = user.cosmetics?.nameColor || (isVip ? 'text-amber-400' : 'text-white');
  const frameClass = user.cosmetics?.frame === 'cyber' ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-blake-800';
  const nameClass = user.cosmetics?.nameColor === 'emerald' ? 'text-emerald-400' : 
                   user.cosmetics?.nameColor === 'rose' ? 'text-rose-400' : 
                   (isVip ? 'text-amber-400' : 'text-white');

  // Chart Data preparation
  const chartData = transactions.slice(0, 10).reverse().map(t => ({
    name: new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    amt: t.amount,
    type: t.receiverId === user.id ? 'in' : 'out'
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <header className={`p-6 border bg-blake-900/20 ${frameClass} relative`}>
        {isVip && (
          <div className="absolute -top-3 -right-3 bg-amber-500 text-blake-950 p-1.5 rounded-full shadow-lg" title="VIP Member">
             <Crown size={20} fill="currentColor" />
          </div>
        )}
        <div className="flex justify-between items-start">
           <div>
             <h1 className={`text-3xl font-light tracking-tight mb-2 flex items-center gap-3 ${nameClass}`}>
               {user.username}
               {user.cosmetics?.title && (
                 <span className="text-xs bg-blake-800 text-blake-400 px-2 py-0.5 rounded-full border border-blake-700 font-mono tracking-wider">
                   {user.cosmetics.title}
                 </span>
               )}
             </h1>
             <p className="text-blake-400 font-mono text-sm">ID: {user.id}</p>
           </div>
           {isVip && <div className="text-xs text-amber-500 font-mono border border-amber-900/50 px-2 py-1 bg-amber-900/10">VIP ACTIVE</div>}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-blake-800 bg-blake-900/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blake-500 uppercase text-xs font-bold tracking-wider">Balance</h3>
            <CreditCard className="text-blake-600" size={20} />
          </div>
          <div className="text-4xl font-mono text-white">{parseFloat(user.balance).toFixed(2)}</div>
        </div>

        <div className="p-6 border border-blake-800 bg-blake-900/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blake-500 uppercase text-xs font-bold tracking-wider">Reputation</h3>
            <TrendingUp className="text-blake-600" size={20} />
          </div>
          <div className="text-4xl font-mono text-white">{user.reputation}</div>
        </div>

        <div className="p-6 border border-blake-800 bg-blake-900/20">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-blake-500 uppercase text-xs font-bold tracking-wider">Activity</h3>
            <Activity className="text-blake-600" size={20} />
          </div>
          <div className="text-4xl font-mono text-white">{transactions.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Section */}
        <section className="space-y-6">
          <div className="p-6 border border-blake-800 bg-blake-900/10">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <ArrowUpRight size={20} className="text-blake-400" />
              Transfer Points
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <Input 
                label="Recipient Username" 
                placeholder="e.g. admin" 
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              />
              <Input 
                label="Amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <div className="pt-2">
                <Button type="submit" className="w-full" isLoading={transferLoading}>
                  Send Transaction
                </Button>
              </div>
              <p className="text-xs text-blake-600 text-center pt-2">
                Transactions are irreversible.
              </p>
            </form>
          </div>

          {/* Activity Chart */}
          <div className="p-6 border border-blake-800 bg-blake-900/10 h-64">
             <h2 className="text-xs font-bold uppercase text-blake-500 mb-4 tracking-wider">Recent Volume</h2>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <XAxis dataKey="name" stroke="#374151" fontSize={10} tickLine={false} axisLine={false} />
                 <Tooltip 
                    cursor={{fill: '#1f2937'}}
                    contentStyle={{ backgroundColor: '#030712', borderColor: '#374151', color: '#e5e7eb' }}
                 />
                 <Bar dataKey="amt">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'in' ? '#10b981' : '#4b5563'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </section>

        {/* Transaction History */}
        <section className="border border-blake-800 bg-blake-900/10 flex flex-col">
          <div className="p-6 border-b border-blake-800">
            <h2 className="text-lg font-medium text-white">History</h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[500px]">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-blake-600 text-sm">No transactions yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-blake-900/50 text-blake-500 font-mono text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">User/System</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blake-800">
                  {transactions.map(tx => {
                    const isReceive = tx.receiverId === user.id;
                    const isSystem = tx.type.startsWith('burn_') || tx.type === 'system_reward';
                    
                    return (
                      <tr key={tx.id} className="hover:bg-blake-900/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isSystem ? (
                               <Star size={16} className="text-amber-500" />
                            ) : isReceive ? ( 
                              <ArrowDownLeft size={16} className="text-emerald-500" /> 
                            ) : (
                              <ArrowUpRight size={16} className="text-blake-400" />
                            )}
                            <span className="text-blake-300 capitalize">
                              {tx.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-blake-600 mt-1 font-mono">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-blake-300">
                          {isReceive ? tx.senderName : tx.receiverName}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono ${isReceive ? 'text-emerald-500' : 'text-blake-400'}`}>
                          {isReceive ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};