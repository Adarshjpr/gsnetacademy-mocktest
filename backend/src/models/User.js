import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    // Required for every student. The bootstrap admin may not have email/mobile.
    name: { type: String, trim: true, maxlength: 80, required: [function () { return this.role !== 'ADMIN'; }, 'Full name is required'] },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, required: [function () { return this.role !== 'ADMIN'; }, 'Email is required'] },
    mobile: { type: String, trim: true, match: [/^[6-9]\d{9}$/, 'Mobile number must be 10 digits'], required: [function () { return this.role !== 'ADMIN'; }, 'Mobile number is required'] },
    // Language the candidate chose — used for instructions, exam screen and messages
    language: { type: String, enum: ['en', 'hi'], default: 'hi' },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
    status: { type: String, enum: ['ACTIVE', 'BLOCKED'], default: 'ACTIVE' },
    lastLoginAt: Date,
    lastActiveAt: Date,
  },
  { timestamps: true }
);

// One account per email and per mobile (partial so admins without them don't collide)
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { mobile: { $type: 'string' } } });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    username: this.username,
    name: this.name || '',
    email: this.email || '',
    mobile: this.mobile || '',
    language: this.language || 'hi',
    role: this.role,
    status: this.status,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export default mongoose.model('User', userSchema);
