import jwt from "jsonwebtoken";

export type JWTPayload = {
    iss:string;
    sub:string;
    iat:number;
    exp:number;
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    const payload : JWTPayload = {
        iss:"chirpy",
        sub:userID,
        iat:(Math.floor(Date.now()/1000)),
        exp:(Math.floor(Date.now()/1000))+expiresIn,
    }

    return jwt.sign(payload,secret);
}