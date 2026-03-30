"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./database");
const emailUtils_1 = require("./emailUtils");
const auth_1 = require("./auth");
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new google_auth_library_1.OAuth2Client(googleClientId) : null;
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
app.use((0, cors_1.default)());
// Middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: "Not authenticated" });
    }
    const token = authHeader.split(' ')[1];
    const payload = (0, auth_1.verifyAccessToken)(token);
    if (!payload || !payload.sub) {
        return res.status(401).json({ detail: "Invalid or expired token" });
    }
    req.user = payload;
    next();
};
// ===================== AUTH =====================
// Signup
app.post('/api/signup', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, confirmPassword, name } = req.body;
    const db = (0, database_1.getDb)();
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser)
        return res.status(400).json({ detail: "Email already registered" });
    const hashedPassword = yield (0, auth_1.hashPassword)(password);
    const token = crypto_1.default.randomBytes(32).toString('hex');
    db.prepare(`
    INSERT INTO users (email, password, name, verification_token, email_verified)
    VALUES (?, ?, ?, ?, 0)
  `).run(email, hashedPassword, name || email.split('@')[0], token);
    yield (0, emailUtils_1.sendVerificationEmail)(email, token);
    res.status(201).json({ message: "Check your email" });
})));
// Login
app.post('/api/login', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const db = (0, database_1.getDb)();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(yield (0, auth_1.verifyPassword)(password, user.password))) {
        return res.status(401).json({ detail: "Invalid credentials" });
    }
    if (user.email_verified === 0) {
        return res.status(403).json({ detail: "Verify email first" });
    }
    const token = (0, auth_1.createAccessToken)({ sub: user.email });
    res.json({ access_token: token });
})));
// ===================== FILES =====================
app.get('/api/files', authenticateToken, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db = (0, database_1.getDb)();
    const files = db.prepare('SELECT * FROM files WHERE user_email = ? ORDER BY date DESC').all(req.user.sub);
    res.json(files);
})));
app.post('/api/files', authenticateToken, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db = (0, database_1.getDb)();
    const f = req.body;
    db.prepare(`
    INSERT INTO files (id, user_email, name, size, type, date, encryption_type, entropy_before, entropy_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(f.id, req.user.sub, f.name, f.size, f.type, f.date, f.encryption_type || f.encryptionType, f.entropy_before || f.entropyBefore, f.entropy_after || f.entropyAfter);
    res.json({ message: "saved" });
})));
// ===================== PROFILE =====================
app.get('/api/me', authenticateToken, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db = (0, database_1.getDb)();
    const user = db.prepare('SELECT email, name FROM users WHERE email = ?').get(req.user.sub);
    res.json(user);
})));
app.post('/api/update-profile', authenticateToken, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db = (0, database_1.getDb)();
    db.prepare('UPDATE users SET name = ? WHERE email = ?').run(req.body.name, req.user.sub);
    res.json({ message: "updated" });
})));
// ===================== ERROR =====================
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ detail: "Server error" });
});
exports.default = app;
