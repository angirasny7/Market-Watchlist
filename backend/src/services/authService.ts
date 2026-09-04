import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';

export class AuthService {
  /**
   * Register a new user with email validation, password strength validation,
   * duplicate prevention, bcrypt hashing, UserState creation, and default Watchlist.
   */
  async register(data: { email: string; password: string; name: string }) {
    const email = data.email?.toLowerCase().trim();
    const name = data.name?.trim();
    const password = data.password;

    if (!name || name.length < 2) {
      const error: any = new Error('Name must be at least 2 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      const error: any = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    // Password strength validation: min 8 chars, uppercase, lowercase, number, special char
    if (!password || password.length < 8) {
      const error: any = new Error('Password must be at least 8 characters long');
      error.statusCode = 400;
      throw error;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-\+=~`[\]\\/]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      const error: any = new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
      error.statusCode = 400;
      throw error;
    }

    // Duplicate email check
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      const error: any = new Error('A user with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user along with default watchlist and initial userState
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        watchlists: {
          create: {
            name: 'Primary Watchlist',
            isDefault: true,
          },
        },
        userState: {
          create: {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
          },
        },
      },
      include: {
        userState: true,
        watchlists: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      userState: user.userState,
      defaultWatchlistId: user.watchlists[0]?.id,
    };
  }

  /**
   * Authenticate an existing user and update activity cursors
   */
  async login(credentials: { email: string; password: string }) {
    const email = credentials.email?.toLowerCase().trim();
    const password = credentials.password;

    if (!email || !password) {
      const error: any = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userState: true,
        watchlists: { where: { isDefault: true } },
      },
    });

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update lastLoginAt and lastActivityAt
    const now = new Date();
    const updatedState = await prisma.userState.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        lastLoginAt: now,
        lastActivityAt: now,
      },
      update: {
        lastLoginAt: now,
        lastActivityAt: now,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      userState: updatedState,
      defaultWatchlistId: user.watchlists[0]?.id,
    };
  }

  /**
   * Retrieve authenticated user profile with active cursor state
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userState: true,
        watchlists: {
          include: {
            stocks: {
              include: { stock: true },
            },
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('User profile not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      userState: user.userState,
      watchlists: user.watchlists,
    };
  }

  /**
   * Update heartbeat timestamp
   */
  async updateHeartbeat(userId: string) {
    return prisma.userState.update({
      where: { userId },
      data: { lastActivityAt: new Date() },
    });
  }
}

export const authService = new AuthService();
