import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { COSTS, calculateFee } from '../economy.js';

const router = express.Router();

// Get All Listings
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const listingsResult = await db.query(`
      SELECT * FROM listings
      ORDER BY
        CASE WHEN boost_until > NOW() THEN 1 ELSE 0 END DESC,
        created_at DESC
    `);

    const purchasesResult = await db.query(
      "SELECT listing_id FROM purchases WHERE user_id = $1",
      [userId]
    );

    const purchasedIds = new Set(purchasesResult.rows.map(p => p.listing_id));

    const sanitizedListings = listingsResult.rows.map(listing => {
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
  } catch (err) {
    res.status(500).json({ error: "DB Error fetching listings" });
  }
});

// Create Listing (With Fee)
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, price } = req.body;
  const authorId = req.user.id;
  const authorName = req.user.username;

  if (!title || !description || !price)
    return res.status(400).json({ error: "Missing fields" });

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0)
    return res.status(400).json({ error: "Price must be greater than 0" });

  const creationFee = await calculateFee(COSTS.LISTING_FEE);

  try {
    const userResult = await db.query("SELECT balance FROM users WHERE id = $1", [authorId]);
    const user = userResult.rows[0];
    if (user.balance < creationFee)
      return res.status(400).json({ error: `Insufficient funds for listing fee (${creationFee} points)` });

    const id = `lst_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const txId = `tx_${Date.now()}_fee`;

    await db.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [creationFee, authorId]);

    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'burn_listing_fee')`,
      [txId, authorId, 'SYSTEM', authorName, 'Marketplace', creationFee]
    );

    await db.query(
      `INSERT INTO listings (id, author_id, author_name, title, description, price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, authorId, authorName, title, description, numPrice]
    );

    res.json({ message: "Listing created", id, feePaid: creationFee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// Unlock (Purchase) Listing
router.post('/:id/unlock', authenticateToken, async (req, res) => {
  const listingId = req.params.id;
  const buyerId = req.user.id;
  const buyerName = req.user.username;

  try {
    const listingResult = await db.query("SELECT * FROM listings WHERE id = $1", [listingId]);
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.author_id === buyerId) return res.status(400).json({ error: "Cannot purchase your own listing" });

    const purchaseCheck = await db.query(
      "SELECT * FROM purchases WHERE user_id = $1 AND listing_id = $2",
      [buyerId, listingId]
    );
    if (purchaseCheck.rows.length > 0) return res.status(400).json({ error: "Already purchased" });

    const buyerResult = await db.query("SELECT * FROM users WHERE id = $1", [buyerId]);
    const buyer = buyerResult.rows[0];
    if (buyer.balance < listing.price) return res.status(400).json({ error: "Insufficient funds" });

    const purchaseId = `pur_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const txId = `tx_${Date.now()}_mkt`;

    await db.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [listing.price, buyerId]);
    await db.query("UPDATE users SET balance = balance + $1, reputation = reputation + 1 WHERE id = $2", [listing.price, listing.author_id]);
    await db.query(
      "INSERT INTO purchases (id, user_id, listing_id) VALUES ($1, $2, $3)",
      [purchaseId, buyerId, listingId]
    );
    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'marketplace_purchase')`,
      [txId, buyerId, listing.author_id, buyerName, listing.author_name, listing.price]
    );

    res.json({ message: "Unlocked successfully", description: listing.description });
  } catch (err) {
    res.status(500).json({ error: "Failed to unlock listing" });
  }
});

// Boost Listing
router.post('/:id/boost', authenticateToken, async (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.id;
  const cost = await calculateFee(COSTS.BOOST_FEE);

  try {
    const listingResult = await db.query("SELECT * FROM listings WHERE id = $1", [listingId]);
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.author_id !== userId) return res.status(403).json({ error: "Can only boost your own listings" });

    const userResult = await db.query("SELECT balance FROM users WHERE id = $1", [userId]);
    const user = userResult.rows[0];
    if (user.balance < cost) return res.status(400).json({ error: `Insufficient funds for boost (${cost})` });

    const now = new Date();
    const currentBoost = listing.boost_until ? new Date(listing.boost_until) : now;
    const start = currentBoost > now ? currentBoost : now;
    const newExpiry = new Date(start.getTime() + (24 * 60 * 60 * 1000));

    const txId = `tx_${Date.now()}_boost`;

    await db.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [cost, userId]);
    await db.query("UPDATE listings SET boost_until = $1 WHERE id = $2", [newExpiry, listingId]);
    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'burn_boost')`,
      [txId, userId, 'SYSTEM', req.user.username, 'Marketplace', cost]
    );

    res.json({ message: "Listing Boosted", boostUntil: newExpiry.toISOString(), cost });
  } catch (err) {
    res.status(500).json({ error: "Failed to boost listing" });
  }
});

// Delete Listing
router.delete('/:id', authenticateToken, async (req, res) => {
  const listingId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const listingResult = await db.query("SELECT * FROM listings WHERE id = $1", [listingId]);
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const isAuthor = listing.author_id === userId;
    const isAdmin = userRole === 'admin';
    if (!isAuthor && !isAdmin) return res.status(403).json({ error: "Permission denied" });

    await db.query("DELETE FROM purchases WHERE listing_id = $1", [listingId]);
    await db.query("DELETE FROM listings WHERE id = $1", [listingId]);

    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;
