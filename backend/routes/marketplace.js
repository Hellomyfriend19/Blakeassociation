import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { COSTS, calculateFee } from '../economy.js';

const router = express.Router();

// Get All Listings
// Sanitizes description if user hasn't purchased it
// Sorts by Boost Status DESC, then Created At DESC
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT * FROM listings 
    ORDER BY 
      CASE WHEN boost_until > datetime('now') THEN 1 ELSE 0 END DESC, 
      created_at DESC
  `;

  db.all(query, [], (err, listings) => {
    if (err) return res.status(500).json({ error: "DB Error fetching listings" });

    // Get user's purchases to determine access
    db.all("SELECT listing_id FROM purchases WHERE user_id = ?", [userId], (err, purchases) => {
      if (err) return res.status(500).json({ error: "DB Error fetching purchases" });

      const purchasedIds = new Set(purchases.map(p => p.listing_id));

      const sanitizedListings = listings.map(listing => {
        const isAuthor = listing.author_id === userId;
        const hasPurchased = purchasedIds.has(listing.id);
        const canView = isAuthor || hasPurchased;
        const isBoosted = listing.boost_until && new Date(listing.boost_until) > new Date();

        return {
          ...listing,
          description: canView ? listing.description : undefined,
          isLocked: !canView,
          isAuthor,
          isBoosted
        };
      });

      res.json(sanitizedListings);
    });
  });
});

// Create Listing (With Fee)
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, price } = req.body;
  const authorId = req.user.id;
  const authorName = req.user.username;
  
  // Calculate Fee
  const creationFee = await calculateFee(COSTS.LISTING_FEE);

  if (!title || !description || !price) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({ error: "Price must be greater than 0" });
  }

  db.serialize(() => {
    // Check balance first
    db.get("SELECT balance FROM users WHERE id = ?", [authorId], (err, user) => {
      if (user.balance < creationFee) {
        return res.status(400).json({ error: `Insufficient funds for listing fee (${creationFee} points)` });
      }

      const id = `lst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const txId = `tx_${Date.now()}_fee`;

      // Deduct Fee
      db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [creationFee, authorId]);
      
      // Log Fee Burn
      db.run(`INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, 'burn_listing_fee', ?)`,
              [txId, authorId, 'SYSTEM', authorName, 'Marketplace', creationFee, now]);

      // Create Listing
      db.run(
        `INSERT INTO listings (id, author_id, author_name, title, description, price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, authorId, authorName, title, description, numPrice, now],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to create listing" });
          }
          res.json({ message: "Listing created", id, feePaid: creationFee });
        }
      );
    });
  });
});

// Unlock (Purchase) Listing
router.post('/:id/unlock', authenticateToken, (req, res) => {
  const listingId = req.params.id;
  const buyerId = req.user.id;
  const buyerName = req.user.username;

  db.serialize(() => {
    db.get("SELECT * FROM listings WHERE id = ?", [listingId], (err, listing) => {
      if (err || !listing) return res.status(404).json({ error: "Listing not found" });

      if (listing.author_id === buyerId) {
        return res.status(400).json({ error: "Cannot purchase your own listing" });
      }

      db.get("SELECT * FROM purchases WHERE user_id = ? AND listing_id = ?", [buyerId, listingId], (err, purchase) => {
        if (purchase) return res.status(400).json({ error: "Already purchased" });

        db.get("SELECT * FROM users WHERE id = ?", [buyerId], (err, buyer) => {
          if (buyer.balance < listing.price) {
            return res.status(400).json({ error: "Insufficient funds" });
          }

          const now = new Date().toISOString();
          const purchaseId = `pur_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const txId = `tx_${Date.now()}_mkt`;

          db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [listing.price, buyerId]);
          db.run("UPDATE users SET balance = balance + ?, reputation = reputation + 1 WHERE id = ?", [listing.price, listing.author_id]);

          db.run("INSERT INTO purchases (id, user_id, listing_id, timestamp) VALUES (?, ?, ?, ?)", 
            [purchaseId, buyerId, listingId, now]);

          db.run(
            `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, 'marketplace_purchase', ?)`,
            [txId, buyerId, listing.author_id, buyerName, listing.author_name, listing.price, now]
          );

          res.json({ message: "Unlocked successfully", description: listing.description });
        });
      });
    });
  });
});

// Boost Listing
router.post('/:id/boost', authenticateToken, async (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.id;
  const cost = await calculateFee(COSTS.BOOST_FEE);

  db.serialize(() => {
    db.get("SELECT * FROM listings WHERE id = ?", [listingId], (err, listing) => {
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      if (listing.author_id !== userId) return res.status(403).json({ error: "Can only boost your own listings" });

      db.get("SELECT balance FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.balance < cost) return res.status(400).json({ error: `Insufficient funds for boost (${cost})` });

        // Calculate Boost Time
        const now = new Date();
        const currentBoost = listing.boost_until ? new Date(listing.boost_until) : now;
        const start = currentBoost > now ? currentBoost : now;
        const newExpiry = new Date(start.getTime() + (24 * 60 * 60 * 1000)); // +24h

        const txId = `tx_${Date.now()}_boost`;

        db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [cost, userId]);
        db.run("UPDATE listings SET boost_until = ? WHERE id = ?", [newExpiry.toISOString(), listingId]);
        
        db.run(`INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, 'burn_boost', ?)`,
                [txId, userId, 'SYSTEM', req.user.username, 'Marketplace', cost, now.toISOString()]);

        res.json({ message: "Listing Boosted", boostUntil: newExpiry.toISOString(), cost });
      });
    });
  });
});

// Delete Listing
router.delete('/:id', authenticateToken, (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  db.serialize(() => {
    db.get("SELECT * FROM listings WHERE id = ?", [listingId], (err, listing) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!listing) return res.status(404).json({ error: "Listing not found" });

      const isAuthor = listing.author_id === userId;
      const isAdmin = userRole === 'admin';

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Permission denied" });
      }

      db.run("DELETE FROM purchases WHERE listing_id = ?", [listingId], (err) => {
        if (err) return res.status(500).json({ error: "Failed cleanup" });
        db.run("DELETE FROM listings WHERE id = ?", [listingId], (err) => {
          if (err) return res.status(500).json({ error: "Failed to delete" });
          res.json({ message: "Listing deleted" });
        });
      });
    });
  });
});

export default router;