import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // hide password by default
  },
  useCase: {
    type: String,
    required: true,
    enum: [
      'Personal Assistant',
      'Business Automation',
      'Customer Support',
      'Content Creation',
      'Research & Learning',
      'Creative Writing',
      'Other'
    ]
  },
  experience: {
    type: String,
    required: true,
    enum: ['New to AI', 'Some Experience', 'Advanced User', 'AI Developer']
  },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'dark' },
    language: { type: String, default: 'en', match: /^[a-z]{2}$/ },
    conversationStyle: { type: String, enum: ['casual', 'professional', 'creative', 'technical'], default: 'casual' },
    responseLength: { type: String, enum: ['short', 'medium', 'detailed'], default: 'medium' }
  },
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
    favoriteTopics: [{ topic: String, count: { type: Number, default: 1 } }]
  },
  lastLogin: { type: Date, default: Date.now },
  aiProfile: {
    learningEnabled: { type: Boolean, default: true },
    interests: [String],
    communicationPatterns: {
      preferredGreeting: String,
      commonQuestions: [String],
      responsePatterns: [String]
    },
    contextMemory: { type: Boolean, default: true }
  },
  registrationSource: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  versionKey: false
});

// Pre-save middleware: hash password if modified
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update usage stats
userSchema.methods.updateUsageStats = async function(messageCount = 1, sessionDuration = 0) {
  this.stats.totalMessages += messageCount;
  this.stats.totalConversations += 1;
  this.stats.lastActiveDate = new Date();

  if (sessionDuration > 0) {
    const totalSessions = this.stats.totalConversations;
    this.stats.averageSessionDuration =
      ((this.stats.averageSessionDuration * (totalSessions - 1)) + sessionDuration) / totalSessions;
  }

  return this.save();
};

// Static method to find by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Create and export model
const User = mongoose.model('User', userSchema);
export default User;
