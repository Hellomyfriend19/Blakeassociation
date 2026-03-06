import db from './database.js';

// Base Costs
export const COSTS = {
  LISTING_FEE: 2.0,
  BOOST_FEE: 5.0,
  VIP_FEE: 30.0,
  COSMETIC_BASE: 10.0
};

export const getFeeMultiplier = () => {
  return new Promise((resolve) => {
    db.get("SELECT SUM(balance) as total FROM users", (err, row) => {
      if (err) return resolve(1);
      
      const total = row?.total || 0;
      const threshold = 5000; // Supply threshold
      
      if (total <= threshold) return resolve(1);
      
      // For every 1000 over threshold, increase fees by 10%
      const excess = total - threshold;
      const multiplier = 1 + (Math.floor(excess / 1000) * 0.1);
      
      // Cap multiplier at 3x to prevent total lockout
      resolve(Math.min(multiplier, 3));
    });
  });
};

export const calculateFee = async (baseFee) => {
  const multiplier = await getFeeMultiplier();
  return parseFloat((baseFee * multiplier).toFixed(2));
};