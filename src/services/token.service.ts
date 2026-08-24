import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '../types/user.types.js';

const signToken = (
    payload: object,
    secret: string,
    expiresIn: string | undefined,
): string => {
    const options: SignOptions = {};
    if (expiresIn) {
        options.expiresIn = expiresIn as SignOptions['expiresIn'];
    }
    return jwt.sign(payload, secret, options);
};

export const generateAccessToken = (user: User): string => {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    if (!accessSecret) {
        throw new Error('ACCESS_TOKEN_SECRET_KEY is not configured');
    }

    return signToken(
        {
            _id: user._id,
            email: user.email,
            name: user.name,
        },
        accessSecret,
        process.env.ACCESS_TOKEN_SECRET_EXPIRY,
    );
};

export const generateResetPasswordToken = (userId: string): string => {
    const resetSecret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!resetSecret) {
        throw new Error('RESET_PASSWORD_TOKEN_SECRET is not configured');
    }

    return signToken({ _id: userId }, resetSecret, process.env.RESET_PASSWORD_TOKEN_SECRET_EXPIRY);
};

export const generateAccountVerificationToken = (userId: string): string => {
    const verificationSecret = process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET;
    if (!verificationSecret) {
        throw new Error('ACCOUNT_VERIFICATION_TOKEN_SECRET is not configured');
    }

    return signToken(
        { _id: userId },
        verificationSecret,
        process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET_EXPIRY,
    );
};
