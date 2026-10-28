import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { ensureAdminUser } from './services/bootstrap.js';
import { ensureSeedTests } from './services/seedTests.js';

/** npm run seed — creates the admin (if missing) and the 4 bundled UGC NET tests (if missing). */
async function run() {
  await connectDB(process.env.MONGO_URI);
  await ensureAdminUser();
  await ensureSeedTests();
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
