import type { Request, Response } from "express";
import { BadRequestError, ForbiddenError, NotFoundError } from "./index.js";
import { NewUser, refreshTokens, NewRToken } from "./db/schema.js";
import { db } from "./db/index.js";
import { eq } from "drizzle-orm"
import { users } from "./db/schema.js";
import { hashPassword, makeRefreshToken, validateJWT } from "./auth.js";
import { UnauthorizedError } from "./index.js";
import { checkPasswordHash } from "./auth.js";
import { makeJWT } from "./jwt.js";
import { config } from "./config.js";

export async function createUser(user: NewUser) {
  const [result] = await db
      .insert(users)
      .values(user)
      .onConflictDoNothing()
      .returning();
    return result;
}

//create
export async function createNewUser (req: Request, res: Response) {
    type rawJSON = {
        email: string;
        password: string;
    }

    const incomingJSON : rawJSON = req.body;
    if (typeof incomingJSON.email === "string" && typeof incomingJSON.password === "string") {
        const user = await createUser({email:incomingJSON.email,hashedPassword:await hashPassword(incomingJSON.password)});
        res.status(201).send({
            "id":user.id,
            "createdAt":user.createdAt,
            "updatedAt":user.updatedAt,
            "email":user.email,
        });
    } else {
        throw new BadRequestError("Invalid request.");
    }

}

export async function createRefreshToken(rToken: NewRToken) {
    await db
        .insert(refreshTokens)
        .values(rToken)
        .onConflictDoNothing()
        .returning();
}

export async function loginUser(req:Request,res:Response) {
    type rawJSON = {
        email: string;
        password: string;
    }

    const incomingJSON : rawJSON = req.body;
    const accessTokenExpiryInSeconds = 3600;
    const refreshToken = makeRefreshToken();

    let user = (await db.select().from(users).where(eq(users.email,incomingJSON.email)))[0];
    if (typeof user !== 'undefined') {
        let rToken = await createRefreshToken({token: refreshToken, userId: user.id, expiresAt: new Date(Date.now()+(60*24*60*60*1000)), revokedAt: null});
    if (await checkPasswordHash(incomingJSON.password,user.hashedPassword)) {
            res.status(200).send({
                "id":user.id,
                "createdAt":user.createdAt,
                "updatedAt":user.updatedAt,
                "email":user.email,
                "token":makeJWT(user.id,accessTokenExpiryInSeconds,config.secret),
                "refreshToken": refreshToken,
            });
        } else {
            throw new UnauthorizedError("Incorrect email or password");
        }
    } else {
        throw new NotFoundError("User not found.");
    }
}

export async function updateEmailAndPassword(req:Request,res:Response) {
    type ReqBody = {
        email: string;
        password: string;
    }
    const reqBody : ReqBody = req.body;
    const accessToken = req.get('Authorization');
    if (typeof accessToken === 'string' && accessToken.startsWith("Bearer ")) {

        try {
            const userId = validateJWT(accessToken.slice(7),config.secret);
            const password = await hashPassword(reqBody.password);
            // following not needed as user validated via validate JWT
            // const user = await db.select().from(users).where(eq(users.id,userId));

            try {
                const result = await db.update(users).set({email:reqBody.email, hashedPassword:password}).where(eq(users.id,userId));
                const updatedUser = await db.select().from(users).where(eq(users.id,userId));
                res.status(200).send({
                    "id":updatedUser[0].id,
                    "createdAt":updatedUser[0].createdAt,
                    "updatedAt":updatedUser[0].updatedAt,
                    "email":updatedUser[0].email,
                });
            } catch {
                throw new BadRequestError("Something went wrong with the db call.");
            }
            
        } catch {
            throw new UnauthorizedError("Authorization header error.");
        }
    } else {
        throw new UnauthorizedError("Authorization header error.");
    }
};
