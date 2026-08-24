import jwt from 'jsonwebtoken';
const signToken = (payload, secret, expiresIn) => {
    const options = {};
    if (expiresIn) {
        options.expiresIn = expiresIn;
    }
    return jwt.sign(payload, secret, options);
};
export const generateAccessToken = (user) => {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    if (!accessSecret) {
        throw new Error('ACCESS_TOKEN_SECRET_KEY is not configured');
    }
    return signToken({
        _id: user._id,
        email: user.email,
        name: user.name,
    }, accessSecret, process.env.ACCESS_TOKEN_SECRET_EXPIRY);
};
export const generateResetPasswordToken = (userId) => {
    const resetSecret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!resetSecret) {
        throw new Error('RESET_PASSWORD_TOKEN_SECRET is not configured');
    }
    return signToken({ _id: userId }, resetSecret, process.env.RESET_PASSWORD_TOKEN_SECRET_EXPIRY);
};
export const generateAccountVerificationToken = (userId) => {
    const verificationSecret = process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET;
    if (!verificationSecret) {
        throw new Error('ACCOUNT_VERIFICATION_TOKEN_SECRET is not configured');
    }
    return signToken({ _id: userId }, verificationSecret, process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET_EXPIRY);
};
