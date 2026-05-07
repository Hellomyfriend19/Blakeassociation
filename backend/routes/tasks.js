import db from './database.js';

export const startCronJobs = () => {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const checkDrop = async () => {
    try {
      const result = await db.query("SELECT value FROM system_state WHERE key = 'last_weekly_drop'");
      const row = result.rows[0];
      if (!row) return;

      const lastDrop = new Date(row.value).getTime();
      const now = Date.now();

      if (now - lastDrop >= SEVEN_DAYS_MS) {
        console.log("Processing weekly 5 coin drop for all users...");
        await db.query("UPDATE users SET balance = balance + 5");
        await db.query("UPDATE system_state SET value = $1 WHERE key = 'last_weekly_drop'", [new Date().toISOString()]);
        console.log("Weekly coin drop completed successfully.");
      }
    } catch (err) {
      console.error("Cron Error:", err);
    }
  };

  setTimeout(checkDrop, 5000);
  setInterval(checkDrop, 3600000);
};
