import express, { NextFunction,Request,Response } from "express";
import path from "path";
import {config} from "./config.js";
import { error } from "console";
import { createNewUser,loginUser,updateEmailAndPassword } from "./users.js";
import { deleteAll } from "./deleteAll.js";
import { createChirp, deleteChirp, getAllChirpsByCreatedAt, getChirpById } from "./chirp.js";
import { makeNewAccessToken, revokeToken, verifyRefreshToken } from "./auth.js";

const app = express();
const PORT = 8080;

//use everything under this file => ./
app.use(middlewareLogResponses);
app.use("/app/", middlewareMetricsInc);
app.use("/app/", express.static("./src/app"));
app.use("/api/", express.json());

//(req: Request, res: Response) => Promise<void>;
// command(path,function)
//app.get('/users', middlewareLogging, middlewareAuth, ...,  handlerGetUsers);
app.get('/api/healthz', middlewareHealthz);
app.get("/admin/metrics", middlewareMetricsLog);
app.get("/api/chirps",(req,res,next)=>{Promise.resolve(getAllChirpsByCreatedAt(req,res)).catch(next)});
app.get("/api/chirps/:chirpID",(req,res,next)=>{Promise.resolve(getChirpById(req,res)).catch(next)});

// below depreciated, error and running handled above for asyncs
// app.post("/api/validate_chirp",middlewareJSONhandler)
// app.post("/admin/reset",middlewareMetricsReset);
// app.post("/api/validate_chirp",(req,res,next)=>{Promise.resolve(middlewareJSONhandler(req,res)).catch(next)});
app.post("/admin/reset",(req,res,next)=>{Promise.resolve(deleteAll(req,res)).catch(next)});
app.post("/api/users",(req,res,next)=>{Promise.resolve(createNewUser(req,res)).catch(next)});
app.post("/api/chirps",(req,res,next)=>{Promise.resolve(createChirp(req,res)).catch(next)});
app.post("/api/login",(req,res,next)=>{Promise.resolve(loginUser(req,res)).catch(next)});
app.post("/api/refresh",(req,res,next)=>{Promise.resolve(verifyRefreshToken(req)).then(result=>makeNewAccessToken(result,res)).catch(next)});
app.post("/api/revoke",(req,res,next)=>{Promise.resolve(revokeToken(req)).then(result=>res.sendStatus(204)).catch(next)});

app.put("/api/users",(req,res,next)=>{Promise.resolve(updateEmailAndPassword(req,res)).catch(next)});

app.delete("/api/chirps/:chirpID",(req,res,next)=>{Promise.resolve(deleteChirp(req,res)).catch(next)});

//error handler
app.use(errorHandler);

//type Middleware = (req: Request, res: Response, next: NextFunction) => void;
function middlewareLogResponses(req:Request, res:Response, next:NextFunction):void {
    res.on("finish", ()=>{
        if (res.statusCode !== 200) {
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`)
        }
    })
    next();
};

function middlewareHealthz(req:Request, res:Response, next:NextFunction):void {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send("OK");
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction): void {
    config.fileserverHits++;
    next();
}

function middlewareMetricsLog(req: Request, res: Response, next: NextFunction): void {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>
    `);
}

// function middlewareMetricsReset(req: Request, res: Response, next: NextFunction): void {
//     config.fileserverHits = 0;
//     res.send(`Hits: ${config.fileserverHits}`);
// }

// using express' solution instead
// async function middlewareJSONhandler(req:Request, res: Response, next: NextFunction): Promise<void> {
//     let reqbody = "";
//     req.on("data",(chunk)=>{reqbody+=chunk;});
//     req.on("end", ()=>{
//         try {
//             const parsedBody = JSON.parse(reqbody);
//             if (parsedBody.body.length > 140) {
//                 res.header("Content-Type","application/json");
//             res.status(400).send(JSON.stringify({"error": "Chirp is too long"}));
//             res.end();
//             } else {
//                 res.header("Content-Type","application/json");
//                 res.status(200).send(JSON.stringify({"valid": true}));
//                 res.end();
//             }
//         } catch (error) {
//             res.header("Content-Type","application/json");
//             res.status(400).send(JSON.stringify({"error":"Something went wrong"}));
//             res.end();
//         }
//     });
// }

// covered by chirp.ts
// async function middlewareJSONhandler(req:Request, res: Response) {
//     type parameters = {
//         body: string;
//     };

//     const params : parameters = req.body;
//     if (params.body.length > 140) {
//         throw new BadRequestError("Chirp is too long. Max length is 140");
//     } else {
//         res.header("Content-Type","application/json");
//         res.status(200).send(JSON.stringify({"cleanedBody":filterWords(params.body)}));
//         res.end();
//     }
// }

//error handling
export class BadRequestError extends Error {
    constructor(message:string) {
        super(message);
        this.name = "BadRequestError";
    }
}
export class UnauthorizedError extends Error {
    constructor(message:string) {
        super(message);
        this.name = "UnauthorizedError";
    }
}
export class ForbiddenError extends Error {
    constructor(message:string) {
        super(message);
        this.name = "ForbiddenError";
    }
}
export class NotFoundError extends Error {
    constructor(message:string) {
        super(message);
        this.name = "NotFoundError";
    }
}

export function errorHandler(err:Error,req:Request,res:Response,next:NextFunction) {
    if (err instanceof BadRequestError) {
        res.status(400).json({"error":err.message});
    } else if (err instanceof UnauthorizedError) {
        res.status(401).json({"error":err.message});
    } else if (err instanceof ForbiddenError) {
        res.status(403).json({"error":err.message});
    } else if (err instanceof NotFoundError) {
        res.status(404).json({"error":err.message});
    } else {
        res.status(500).send("Internal Server Error")
    }
}

//run server on port and print log
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});