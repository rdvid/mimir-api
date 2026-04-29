import { UAParser } from 'ua-parser-js';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import UserModel, {
    type User,
    type UserDocument,
    type ActiveSession,
} from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { sendMessageToUser } from '../utils/EmailSend.js';
import { generateUniqueUsername } from '../utils/utilities.js';

interface ClientInfo {
    ip: string;
    browser: string;
    os: string;
    deviceType: string;
}

export function getClientInfo(req: Request): ClientInfo {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
        (typeof forwardedFor === 'string' ? forwardedFor.split(',').shift() : undefined) ??
        req.ip ??
        req.socket.remoteAddress ??
        'Unknown';

    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();

    return {
        ip,
        browser: ua.browser.name ?? 'Unknown',
        os: ua.os.name ?? 'Unknown',
        deviceType: ua.device.type ?? 'Desktop',
    };
}

export async function createSession(user: UserDocument, req: Request): Promise<string> {
    const token = await user.generateAccessToken();
    const clientInfo = getClientInfo(req);

    const newSession: ActiveSession = {
        token,
        ip: clientInfo.ip,
        userAgent: `${clientInfo.browser} on ${clientInfo.os} (${clientInfo.deviceType})`,
    };

    user.activeSessions.push(newSession);
    user.lastLogin = user.currentLogin || new Date();
    user.currentLogin = new Date();
    await user.save({ validateBeforeSave: false });
    return token;
}

export async function createUserAndSendVerification(
    req: Request,
    name: string,
    email: string,
    password?: string | null,
    googleId?: string,
    picture?: string,
): Promise<UserDocument> {
    const uniqueUsername = await generateUniqueUsername(name);

    const userData: Partial<User> = {
        username: uniqueUsername,
        name,
        email,
    };

    if (password) {
        userData.password = password;
    }
    if (googleId) {
        userData.googleId = googleId;
        userData.authProvider = 'google';
    }
    if (picture) {
        userData.avatar = picture;
    }

    const user = await UserModel.create(userData);
    await createSession(user, req);
    const createdUser = await UserModel.findById(user._id).select('-password');

    if (!createdUser) {
        throw new ApiError(500, `${name} - unable to register user!!`);
    }

    const accountSecret = process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET;
    if (!accountSecret) {
        throw new ApiError(500, 'ACCOUNT_VERIFICATION_TOKEN_SECRET is not configured');
    }

    const token = jwt.sign({ _id: createdUser._id }, accountSecret, {
        expiresIn: process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET_EXPIRY,
    });

    await sendMessageToUser(
        createdUser.name,
        'VERIFY_ACCOUNT',
        createdUser.email,
        'Budgetter Account Verification',
        token,
    );

    return createdUser;
}
