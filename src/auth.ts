import jwt from 'jsonwebtoken';
import { JWTPayload, makeJWT } from './jwt.js';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { BadRequestError, UnauthorizedError } from './index.js';
import { randomBytes } from 'crypto';
import { db } from "./db/index.js";
import { eq, gt, and, isNull } from 'drizzle-orm';
import { refreshTokens, users } from './db/schema.js';
import { config } from './config.js';

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password,0);
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password,hash);
} 

//returns user ID
// iss (issuer) - who issued the token
// sub (subject) - who the token is about
// aud (audience) - who the token is intended for
// exp (expiration) - when the token expires
// iat (issued at) - when the token was created
export function validateJWT(tokenString: string, secret: string): string {
    try {
        const decoded : JWTPayload = jwt.verify(tokenString,secret) as JWTPayload;
        if (typeof decoded.sub === "string") {
            return decoded.sub;
        } else {
            throw new UnauthorizedError("JWT verification error.");
        }
    } catch {
        throw new UnauthorizedError("JWT verification error.")
    }
}

export function getBearerToken(req: Request): string {
    const tokenString = req.get('Authorization');
    if (typeof tokenString === 'string' && tokenString.startsWith("Bearer ")) {
        return tokenString.slice(7).trim();
    } else {
        throw new BadRequestError("Authorization header error.");
    }
}

export function makeRefreshToken():string {
    return randomBytes(32).toString('hex');
}

export async function verifyRefreshToken(req:Request) {
    const tokenString = req.get('Authorization');
    if (typeof tokenString === 'string' && tokenString.startsWith("Bearer ")) {
        const token = tokenString.slice(7).trim();
        const result = await db.select().from(refreshTokens).where(and(
            eq(refreshTokens.token,token),gt(refreshTokens.expiresAt,new Date(Date.now())),isNull(refreshTokens.revokedAt)
        )).limit(1);
        if (result.length <= 0) {
            throw new UnauthorizedError("Invalid token.");
        } else {
            return result[0].userId;
        }
    } else {
        throw new BadRequestError("Authorization header error.");
    }
}

export function makeNewAccessToken (userId:string,res:Response) {
    const newAccessToken = makeJWT(userId,3600,config.secret);
    res.status(200).send({"token":newAccessToken});
}

export async function revokeToken(req:Request) {
    const tokenString = req.get('Authorization');
    if (typeof tokenString === 'string' && tokenString.startsWith("Bearer ")) {
        const token = tokenString.slice(7).trim();
        const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token,token)).limit(1);
        if (result.length <= 0) {
            throw new UnauthorizedError("Invalid token.");
        } else {
            const updatedResult = await db.update(refreshTokens).set({updatedAt:new Date(Date.now()),revokedAt:new Date(Date.now())}).where(eq(refreshTokens.token,token));
        }
    } else {
        throw new BadRequestError("Authorization header error.");
    }
}