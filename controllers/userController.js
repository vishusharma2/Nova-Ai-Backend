import User from '../models/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  user.password = undefined;
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      useCase: user.useCase,
      experience: user.experience,
      preferences: user.preferences,
      createdAt: user.createdAt
    }
  });
};

class UserController {
  static async signup(req, res) {
    try {
      const { username, email, password, useCase, experience } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const user = await User.create({ username, email, password, useCase, experience });
      sendTokenResponse(user, 201, res, 'Account created successfully');
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async login(req, res) {
    try {
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
      }

      email = email.toLowerCase().trim();

      const user = await User.findOne({ email }).select('+password');
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      const isMatch = await user.comparePassword(password.trim());
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

      sendTokenResponse(user, 200, res, 'Login successful');
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async logout(req, res) {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
}

export default UserController;
