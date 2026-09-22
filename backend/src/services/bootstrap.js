import bcrypt from 'bcryptjs';
import User from '../models/User.js';

/** Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD if no admin exists yet. */
export async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;
  if (await User.exists({ role: 'ADMIN' })) return;

  const existing = await User.findOne({ username });
  if (existing) {
    existing.role = 'ADMIN';
    await existing.save();
    console.log(`Promoted existing user "${username}" to ADMIN`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username, passwordHash, role: 'ADMIN', name: 'Administrator' });
  console.log(`Admin user "${username}" created. Change the password after first login.`);
}
