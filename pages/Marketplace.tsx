import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Listing, User } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AuthService } from '../services/auth';
import toast from 'react-hot-toast';
import { Lock, Unlock, ShoppingBag, Plus, Coins, Trash2, Rocket, Zap, Flag } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';

export const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Report State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const handleReport = (id: string) => {
    setReportingId(id);
    setReportModalOpen(true);
  };
  
  // Economy constants (could fetch from backend for absolute precision, but hardcoded for UI responsiveness)
  const LISTING_FEE = 2.0; 
  const BOOST_FEE = 5.0;

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const loadData = async () => {
    try {
      const [u, l] = await Promise.all([
        AuthService.getCurrentUser(),
        db.getListings()
      ]);
      setUser(u);
      setListings(l);
    } catch (e) {
      toast.error("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc || !newPrice) return;
    if (user && user.balance < LISTING_FEE) {
      toast.error(`Insufficient balance for listing fee (${LISTING_FEE})`);
      return;
    }
    
    setProcessingId('create');
    try {
      await db.createListing(newTitle, newDesc, parseFloat(newPrice));
      toast.success("Listing published");
      setNewTitle('');
      setNewDesc('');
      setNewPrice('');
      setShowCreateForm(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnlock = async (listing: Listing) => {
    if (!user) return;
    if (user.balance < listing.price) {
      toast.error("Insufficient balance");
      return;
    }

    if (!confirm(`Unlock "${listing.title}" for ${listing.price} points?`)) return;

    setProcessingId(listing.id);
    try {
      const result = await db.unlockListing(listing.id);
      toast.success("Unlocked successfully");
      
      setListings(prev => prev.map(l => 
        l.id === listing.id 
          ? { ...l, isLocked: false, description: result.description } 
          : l
      ));
      
      AuthService.getCurrentUser().then(setUser);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm(`Delete listing "${listing.title}"? This cannot be undone.`)) return;
    
    setProcessingId(listing.id);
    try {
      await db.deleteListing(listing.id);
      toast.success("Listing deleted");
      setListings(prev => prev.filter(l => l.id !== listing.id));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBoost = async (listing: Listing) => {
    if (!user) return;
    if (user.balance < BOOST_FEE) {
      toast.error("Insufficient points for boost");
      return;
    }
    if (!confirm(`Boost "${listing.title}" for 24h? Cost: ${BOOST_FEE} points.`)) return;

    setProcessingId(listing.id);
    try {
      await db.boostListing(listing.id);
      toast.success("Listing Boosted!");
      loadData(); // Reload to see sort order change
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex justify-between items-end border-b border-blake-800 pb-6">
        <div>
          <h1 className="text-3xl font-light text-white mb-2">Information Marketplace</h1>
          <p className="text-blake-400 font-mono text-sm">
            Buy and sell verified information. Balance: <span className="text-emerald-500">{parseFloat(user?.balance).toFixed(2)}</span>
          </p>
        </div>
        <Button 
          variant={showCreateForm ? 'secondary' : 'primary'}
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          {showCreateForm ? 'Cancel' : <><Plus size={16}/> Sell Info</>}
        </Button>
      </header>

      {/* Create Listing Form */}
      {showCreateForm && (
        <div className="bg-blake-900/20 border border-blake-800 p-6 animate-slide-in">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-blake-400"/> New Listing
            <span className="ml-auto text-xs font-mono text-amber-500 border border-amber-900/50 bg-amber-900/10 px-2 py-1">
              Fee: {LISTING_FEE} pts
            </span>
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <Input 
                  label="Title" 
                  placeholder="e.g. Server Access Codes Level 3" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div>
                <Input 
                  label="Price (Points)" 
                  type="number" 
                  step="0.1"
                  placeholder="10.0" 
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full">
              <label className="block text-xs uppercase tracking-widest text-blake-500 mb-1 font-mono">
                Content (Hidden until purchased)
              </label>
              <textarea
                className="w-full bg-blake-900 border border-blake-700 text-blake-100 px-3 py-2 text-sm focus:outline-none focus:border-blake-400 transition-colors placeholder-blake-700 h-32"
                placeholder="Enter the sensitive information here..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={processingId === 'create'}>
                Publish Listing
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map(listing => {
          const canDelete = user && (user.role === 'admin' || listing.isAuthor);
          const canBoost = user && listing.isAuthor && !listing.isBoosted;
          
          return (
            <div key={listing.id} className={`border flex flex-col transition-all relative group ${
              listing.isBoosted 
                ? 'border-amber-500/30 bg-amber-900/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                : 'border-blake-800 bg-blake-900/10 hover:border-blake-600'
            }`}>
              {/* Boost Badge */}
              {listing.isBoosted && (
                <div className="absolute -top-3 -right-3 z-20 bg-amber-500 text-blake-950 p-1 rounded-full shadow-lg">
                  <Zap size={16} fill="currentColor" />
                </div>
              )}

              <div className={`p-5 border-b flex justify-between items-start ${listing.isBoosted ? 'border-amber-900/30' : 'border-blake-800'}`}>
                <div>
                  <h3 className={`font-medium text-lg leading-tight mb-1 pr-6 ${listing.isBoosted ? 'text-amber-100' : 'text-white'}`}>
                    {listing.title}
                  </h3>
                  <div className="text-xs text-blake-500 font-mono">by {listing.author_name}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-emerald-500 font-mono bg-emerald-900/10 px-2 py-1 border border-emerald-900/30 rounded-sm">
                    <Coins size={14} />
                    {parseFloat(listing.price).toFixed(1)}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons (Hover) */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {!listing.isAuthor && (
                   <button
                     onClick={() => handleReport(listing.id)}
                     className="text-blake-600 hover:text-red-500 transition-colors p-1"
                     title="Report Abuse"
                   >
                     <Flag size={16} />
                   </button>
                 )}
                 {canBoost && (
                  <button
                    onClick={() => handleBoost(listing)}
                    disabled={!!processingId}
                    className="text-amber-500 hover:text-amber-300 transition-colors p-1"
                    title={`Boost Listing (${BOOST_FEE} pts)`}
                  >
                    <Rocket size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(listing)}
                    disabled={!!processingId}
                    className="text-blake-600 hover:text-red-500 transition-colors p-1"
                    title="Delete Listing"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="p-5 flex-1 relative bg-blake-950/30">
                {listing.isLocked ? (
                  <div className="relative h-full min-h-[100px] flex items-center justify-center">
                    <div className="absolute inset-0 filter blur-sm select-none opacity-50 text-blake-700 text-sm p-2 overflow-hidden">
                      Lorem ipsum dolor sit amet content hidden restricted access protocol denied secure layer active...
                    </div>
                    <div className="relative z-10 text-center">
                      <Lock className="w-8 h-8 text-blake-500 mx-auto mb-2" />
                      <span className="text-xs uppercase tracking-widest text-blake-400">Restricted</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-blake-300 font-mono whitespace-pre-wrap">
                    {listing.description}
                  </div>
                )}
              </div>

              <div className={`p-4 border-t ${listing.isBoosted ? 'bg-amber-900/10 border-amber-900/30' : 'bg-blake-900/20 border-blake-800'}`}>
                {listing.isLocked ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUnlock(listing)}
                    isLoading={processingId === listing.id}
                    disabled={!!processingId}
                  >
                    Unlock Content
                  </Button>
                ) : (
                  <div className="w-full text-center py-2 text-xs font-medium text-emerald-500 uppercase tracking-widest border border-emerald-900/30 bg-emerald-900/5">
                     <Unlock size={14} className="inline mr-2 mb-0.5" />
                     {listing.isAuthor ? 'Owned (You)' : 'Purchased'}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {listings.length === 0 && (
          <div className="col-span-full py-12 text-center text-blake-600 border border-dashed border-blake-800">
            No active listings found in the network.
          </div>
        )}
      </div>

      <ReportModal 
        isOpen={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
        contentId={reportingId || ''} 
        contentType="listing" 
      />
    </div>
  );
};