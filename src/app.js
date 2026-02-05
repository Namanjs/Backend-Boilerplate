import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json({
    limit: "16kb"
}));

app.use(express.urlencoded({
    extended: true,// If false node's native "querystring" will be used which cannot handle nested objects
    limit: "16kb"// Allow the use of qs(external dependency) able to handle ne
}));// Handles data from HTML Forms and Postman's x-www-form-urlencoded

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true //Allows the browser to send cookies
}));

app.use(cookieParser(process.env.COOKIE_SECRET));

import userRouter from "./routers/user.router.js";

app.use("/api/v1/user", userRouter)

app.use(errorHandler);

export {app};