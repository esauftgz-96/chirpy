import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "./index.js";
import { NewChirp } from "./db/schema.js";
import { db } from "./db/index.js";
import { chirps } from "./db/schema.js";
import {filterWords} from "./filter.js";
import { eq } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "./index.js";
import { getBearerToken, validateJWT } from "./auth.js";
import { config } from "./config.js";

export async function createChirpinDb (chirp: NewChirp) {
    const [result] = await db
        .insert(chirps)
        .values(chirp)
        .onConflictDoNothing()
        .returning();
    return result;
}

//create
export async function createChirp(req:Request,res:Response) {
    type payload = {
        body: string;
    }

    try {
        const bearerToken = getBearerToken(req);
        const jwtToken = validateJWT(bearerToken,config.secret);

        const newChirp : payload = req.body;
        if (!newChirp.body) {
            throw new BadRequestError("Invalid chirp.");
        } else if (newChirp.body.length > 140) {
            throw new BadRequestError("Chirp is too long. Max length is 140");
        } else {
            const chirp = await createChirpinDb({
                body: newChirp.body,
                userId: jwtToken,
            });
            res.status(201).send({
                "id":chirp.id,
                "createdAt":chirp.createdAt,
                "updatedAt":chirp.updatedAt,
                "body":chirp.body,
                "userId":chirp.userId,
            });
        }
    } catch {
        throw new UnauthorizedError("Token issue.");
    }
}

//read all
export async function getAllChirpsByCreatedAt(req:Request,res:Response) {
    try {
        let authorId = "";
        //req.query handles GET ...?authorId=1
        let authorIdQuery = req.query.authorId;

        let finalChirps : any[]  = [];
        if (typeof authorIdQuery === "string") {
            authorId = authorIdQuery;
            finalChirps = await db.select().from(chirps).where(eq(chirps.userId,authorId));
        } else if (typeof authorIdQuery === 'undefined') {
            finalChirps = await db.select().from(chirps);
        }

        let sort = req.query.sort;
        if (sort === "asc" || typeof sort === undefined) {
            finalChirps.sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
        } else if (sort === "desc") {
            finalChirps.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
        }

        
        res.status(200).send(finalChirps);
    } catch {
        throw new BadRequestError("DB query issue.");
    }
}

//read by id
export async function getChirpById(req:Request,res:Response) {
    try {
        //req.param accesses the path variable provided in the url in index
        const chirpID : string = req.params.chirpID;
        const chirp = await db.select().from(chirps).where(eq(chirps.id, chirpID));
        if (chirp.length === 0) {
            throw new NotFoundError("Chirp not found.");
        } else {
            //eq returns an array
            res.status(200).send(chirp[0]);
        }     
    } catch {
        throw new NotFoundError("Chirp ID invalid.");
    }
}

export async function deleteChirp(req:Request,res:Response) {
    const accessToken = req.get('Authorization');
    if (typeof accessToken === 'string' && accessToken.startsWith("Bearer ")) {

            const userId = validateJWT(accessToken.slice(7),config.secret);
            const chirpID : string = req.params.chirpID;
            const chirp = await db.select().from(chirps).where(eq(chirps.id, chirpID));

            if (chirp.length !== 0) {
                if (userId === chirp[0].userId) {
                    const deletedChirp = await db.delete(chirps).where(eq(chirps.id, chirpID));
                    res.status(204).send();
                    return;
                } else {
                    throw new ForbiddenError("Authorization header error.");
                }
            } else {
                throw new NotFoundError("Chirp not found.");
            }

    } else {
        throw new UnauthorizedError("Authorization header error.");
    }
}