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
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createAccessToken = createAccessToken;
exports.verifyAccessToken = verifyAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = 60;
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.hash(password, 10);
    });
}
function verifyPassword(password, hashed) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.compare(password, hashed);
    });
}
function createAccessToken(data) {
    return jsonwebtoken_1.default.sign(data, SECRET_KEY, {
        algorithm: ALGORITHM,
        expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`
    });
}
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, SECRET_KEY);
    }
    catch (e) {
        return null;
    }
}
