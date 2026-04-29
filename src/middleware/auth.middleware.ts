import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';

import { ApiError } from '../utils/ApiError.js';
import type { NextFunction, Request, Response } from 'express';


const verifyJwtToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const authorizationHeader = req.header('Authorization');
        const token = authorizationHeader?.replace('Bearer ', '') ?? '';

        if (!token) {
            throw new ApiError(401, 'UnAuthorized User!!');
        }

        const accessSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
        if (!accessSecret) {
            throw new ApiError(500, 'ACCESS_TOKEN_SECRET_KEY is not configured');
        }

        const decodedToken = jwt.verify(token, accessSecret) as { _id?: string };
        if (!decodedToken || !decodedToken._id) {
            throw new ApiError(401, 'Token decode Error!!');
        }

        const user = await UserModel.findById(decodedToken._id);
        if (!user) {
            throw new ApiError(401, 'User not found by Access Token');
        }

        await UserModel.updateOne(
            { _id: user._id, 'activeSessions.token': token },
            { $set: { 'activeSessions.$.lastUsedAt': new Date() } },
        );

        req.user = user;
        req.token = token;
        next();
    } catch (error: unknown) {
        next(error);
    }
};

export default verifyJwtToken;
