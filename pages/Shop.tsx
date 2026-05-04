import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { Button } from '../components/Button';
import { AuthService } from '../services/auth';
import toast from 'react-hot-toast';
import { Crown, Sparkles, User as UserIcon, Palette } from 'lucide-react';

export const Shop: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [prices, setPrices] = useState({ vip: 30, cosmetic: 10 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      const [u, p] = await Promise.all([
        AuthService.getCurrentUser(),
        db.getShopPrices()
      ]);
      setUser(u);
      setPrices(p);
    } catch (e) {
      toast.error("Failed to load shop");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuyVIP = async () => {
    if (!user) return;
    if (user.balance < prices.vip) {
      toast.error("Insufficient points");
      return;
    }
    if (!confirm(`Purchase VIP Status for ${prices.vip} points? This is non-refundable.`)) return;

    setProcessing(true);
    try {
      await db.buyVIP();
      toast.success("Welcome to the VIP Club");
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyCosmetic = async (type: string, value: string, name: string) => {
    if (!user) return;
    if (user.balance < prices.cosmetic) {
      toast.error("Insufficient points");
      return;
    }
    if (!confirm(`Unlock "${name}" for ${prices.cosmetic} points?`)) return;

    setProcessing(true);
    try {
      await db.buyCosmetic(type, value);
      toast.success("Cosmetic equipped!");
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !user) return null;

  const isVip = user.vip_until && new Date(user.vip_until) > new Date();

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-light text-white mb-2">Prestige Shop</h1>
        <p className="text-blake-400 font-mono text-sm">
          Spend points on status symbols. Coins are burned to stabilize the economy.
        </p>
        <div className="mt-4 inline-block bg-blake-900 border border-blake-800 px-4 py-2 text-sm font-mono text-emerald-500">
          Your Balance: {parseFloat(user.balance).toFixed(2)}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* VIP Section */}
        <section className={`border ${isVip ? 'border-amber-500/50 bg-amber-900/10' : 'border-blake-800 bg-blake-900/10'} p-6 relative overflow-hidden`}>
          <div className="flex items-start justify-between mb-6">
             <div>
                <h2 className={`text-xl font-medium ${isVip ? 'text-amber-400' : 'text-white'} flex items-center gap-2`}>
                  <Crown size={24} className={isVip ? 'text-amber-400' : 'text-blake-400'} />
                  VIP Status
                </h2>
                <p className="text-sm text-blake-400 mt-2">
                  Gain the Gold Username, Exclusive Badge, and Priority Support visibility.
                </p>
             </div>
             <div className="text-right">
                <div className="text-2xl font-mono text-white">{prices.vip}</div>
                <div className="text-xs text-blake-500 uppercase">Points / 30 Days</div>
             </div>
          </div>

          <div className="space-y-4">
             <ul className="text-sm text-blake-300 space-y-2 list-disc list-inside">
                <li>Gold Username color across the app</li>
                <li>VIP Badge on profile</li>
                <li>Supports the economy (Burn sink)</li>
             </ul>

             {isVip ? (
               <div className="mt-6 p-3 bg-amber-500/20 border border-amber-500/50 text-amber-200 text-center text-sm font-mono">
                 Active until {new Date(user.vip_until!).toLocaleDateString()}
               </div>
             ) : (
               <Button onClick={handleBuyVIP} className="w-full mt-4" disabled={processing || user.balance < prices.vip}>
                 Purchase Membership
               </Button>
             )}
          </div>
        </section>

        {/* Cosmetics Section */}
        <section className="border border-blake-800 bg-blake-900/10 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette size={20} className="text-blake-400"/>
            <h2 className="text-xl font-medium text-white">Cosmetics</h2>
          </div>
          <p className="text-sm text-blake-500 mb-6">
            Permanent visual upgrades. Cost: <span className="text-white font-mono">{prices.cosmetic}</span> points each.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-blake-800 bg-blake-950/50 hover:border-blake-600 transition-colors">
               <div className="text-emerald-400 font-medium mb-1">Emerald Title</div>
               <div className="text-xs text-blake-500 mb-3">Set your username color to Emerald.</div>
               <Button 
                  variant="secondary" 
                  className="w-full text-xs"
                  onClick={() => handleBuyCosmetic('nameColor', 'emerald', 'Emerald Name')}
                  disabled={processing}
               >
                 Buy
               </Button>
            </div>

            <div className="p-4 border border-blake-800 bg-blake-950/50 hover:border-blake-600 transition-colors">
               <div className="text-cyan-400 font-medium mb-1">Cyber Frame</div>
               <div className="text-xs text-blake-500 mb-3">A digital border for your profile.</div>
               <Button 
                  variant="secondary" 
                  className="w-full text-xs"
                  onClick={() => handleBuyCosmetic('frame', 'cyber', 'Cyber Frame')}
                  disabled={processing}
               >
                 Buy
               </Button>
            </div>

            <div className="p-4 border border-blake-800 bg-blake-950/50 hover:border-blake-600 transition-colors">
               <div className="text-purple-400 font-medium mb-1">Void Title</div>
               <div className="text-xs text-blake-500 mb-3">Custom title "Void Walker".</div>
               <Button 
                  variant="secondary" 
                  className="w-full text-xs"
                  onClick={() => handleBuyCosmetic('title', 'Void Walker', 'Void Title')}
                  disabled={processing}
               >
                 Buy
               </Button>
            </div>

             <div className="p-4 border border-blake-800 bg-blake-950/50 hover:border-blake-600 transition-colors">
               <div className="text-rose-400 font-medium mb-1">Red Alert</div>
               <div className="text-xs text-blake-500 mb-3">Set your username color to Rose.</div>
               <Button 
                  variant="secondary" 
                  className="w-full text-xs"
                  onClick={() => handleBuyCosmetic('nameColor', 'rose', 'Rose Name')}
                  disabled={processing}
               >
                 Buy
               </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};