import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ensureAdminUser } from './services/bootstrap.js';
import { startExpirySweeper } from './services/attempt.service.js';
import { ensureSeedTests } from './services/seedTests.js';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('JWT_SECRET is missing or too short (min 16 chars). Set it in backend/.env');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URI);
  await ensureAdminUser();
  // Loads the 4 bundled UGC NET tests on first start (set SEED_ON_START=false to skip)
  if (process.env.SEED_ON_START !== 'false') await ensureSeedTests();
  startExpirySweeper();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
