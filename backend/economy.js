import db from './database.js';

// Base Costs
export const COSTS = {
  LISTING_FEE: 2.0,
  BOOST_FEE: 5.0,
  VIP_FEE: 30.0,
  COSMETIC_BASE: 10.0
};

export const getFeeMultiplier = async () => {
  try {
    const result = await db.query("SELECT SUM(balance) as total FROM users");
    const total = parseFloat(result.rows[0]?.total) || 0;
    const threshold = 5000;

    if (total <= threshold) return 1;

    const excess = total - threshold;
    const multiplier = 1 + (Math.floor(excess / 1000) * 0.1);
    return Math.min(multiplier, 3);
  } catch (err) {
    return 1;
  }
};

export const calculateFee = async (baseFee) => {
  const multiplier = await getFeeMultiplier();
  return parseFloat((baseFee * multiplier).toFixed(2));
};
