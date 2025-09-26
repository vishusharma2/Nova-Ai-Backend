import express from 'express';
import UserController from '../controllers/userController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- Public routes ---
router.post('/signup', UserController.signup);
router.post('/login', UserController.login);

// --- Protected route for logout ---
router.post('/logout', protect, UserController.logout);

export default router;
