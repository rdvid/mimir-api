import { UAParser } from 'ua-parser-js';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { sendMessageToUser } from '../utils/EmailSend.js';
import { generateUniqueUsername } from '../utils/utilities.js';
import { generateAccessToken, generateAccountVerificationToken, } from './token.service.js';
export function getClientInfo(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',').shift() : undefined) ??
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
export async function createSession(user, req) {
    const token = generateAccessToken(user);
    const clientInfo = getClientInfo(req);
    const newSession = {
        _id: '',
        token,
        ip: clientInfo.ip,
        userAgent: `${clientInfo.browser} on ${clientInfo.os} (${clientInfo.deviceType})`,
    };
    await userRepository.addSession(user._id, newSession, {
        lastLogin: user.currentLogin ?? null,
        currentLogin: new Date(),
    });
    return token;
}
export async function createUserAndSendVerification(req, name, email, password, googleId, picture) {
    const uniqueUsername = await generateUniqueUsername(name);
    const createdUser = await userRepository.create({
        username: uniqueUsername,
        name,
        email,
        password: password ?? undefined,
        googleId,
        authProvider: googleId ? 'google' : 'local',
        avatar: picture,
    });
    await createSession(createdUser, req);
    const userWithoutPassword = await userRepository.findById(createdUser._id);
    if (!userWithoutPassword) {
        throw new ApiError(500, `${name} - unable to register user!!`);
    }
    const token = generateAccountVerificationToken(userWithoutPassword._id);
    await sendMessageToUser(userWithoutPassword.name, 'VERIFY_ACCOUNT', userWithoutPassword.email, 'Budgetter Account Verification', token);
    return userWithoutPassword;
}
