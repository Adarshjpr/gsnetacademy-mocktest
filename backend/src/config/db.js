import mongoose from 'mongoose';

/** Connects to MongoDB, retrying for ~1 minute (useful when Docker starts Mongo and the API together). */
export async function connectDB(uri, { retries = 12, delayMs = 5000 } = {}) {
  if (!uri) throw new Error('MONGO_URI is not set');
  mongoose.set('strictQuery', true);
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`MongoDB not ready (${err.message}). Retry ${attempt}/${retries - 1} in ${delayMs / 1000}s…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
