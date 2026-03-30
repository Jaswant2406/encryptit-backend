import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getDb } from './database';
import { sendVerificationEmail, sendPasswordResetEmail } from './emailUtils';
import { hashPassword, verifyPassword, createAccessToken, verifyAccessToken } from './auth';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

// Middleware
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: "Not authenticated" });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload || !payload.sub) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }

  req.user = payload;
  next();
};

// ===================== AUTH =====================

// Signup
app.post('/api/signup', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, confirmPassword, name } = req.body;
  const db = getDb();

  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existingUser) return res.status(400).json({ detail: "Email already registered" });

  const hashedPassword = await hashPassword(password);
  const token = crypto.randomBytes(32).toString('hex');

  db.prepare(`
    INSERT INTO users (email, password, name, verification_token, email_verified)
    VALUES (?, ?, ?, ?, 0)
  `).run(email, hashedPassword, name || email.split('@')[0], token);

  await sendVerificationEmail(email, token);

  res.status(201).json({ message: "Check your email" });
}));

// Login
app.post('/api/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }

  if (user.email_verified === 0) {
    return res.status(403).json({ detail: "Verify email first" });
  }

  const token = createAccessToken({ sub: user.email });

  res.json({ access_token: token });
}));

// ===================== FILES =====================

app.get('/api/files', authenticateToken, asyncHandler(async (req: any, res) => {
  const db = getDb();

  const files = db.prepare(
    'SELECT * FROM files WHERE user_email = ? ORDER BY date DESC'
  ).all(req.user.sub);

  res.json(files);
}));

app.post('/api/files', authenticateToken, asyncHandler(async (req: any, res) => {
  const db = getDb();
  const f = req.body;

  db.prepare(`
    INSERT INTO files (id, user_email, name, size, type, date, encryption_type, entropy_before, entropy_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    f.id,
    req.user.sub,
    f.name,
    f.size,
    f.type,
    f.date,
    f.encryption_type || f.encryptionType,
    f.entropy_before || f.entropyBefore,
    f.entropy_after || f.entropyAfter
  );

  res.json({ message: "saved" });
}));

// ===================== PROFILE =====================

app.get('/api/me', authenticateToken, asyncHandler(async (req: any, res) => {
  const db = getDb();

  const user = db.prepare(
    'SELECT email, name FROM users WHERE email = ?'
  ).get(req.user.sub);

  res.json(user);
}));

app.post('/api/update-profile', authenticateToken, asyncHandler(async (req: any, res) => {
  const db = getDb();

  db.prepare(
    'UPDATE users SET name = ? WHERE email = ?'
  ).run(req.body.name, req.user.sub);

  res.json({ message: "updated" });
}));

// ===================== ERROR =====================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ detail: "Server error" });
});

export default app;