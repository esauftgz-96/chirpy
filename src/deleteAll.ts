import type { Request, Response } from "express";
import { ForbiddenError } from "./index.js";
import { db } from "./db/index.js";
import { NewUser, users, chirps, refreshTokens } from "./db/schema.js";
import { config } from "./config.js";

export async function deleteAll(req: Request, res: Response) {
    if (config.platform !== "dev") {
        throw new ForbiddenError("Incorrect privileges.");
    } else {
        await db.delete(users);
        await db.delete(chirps);
        await db.delete(refreshTokens);
        res.status(200);
        res.end();
    }
}