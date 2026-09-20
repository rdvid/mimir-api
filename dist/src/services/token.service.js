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
        id: user.id,
        email: user.email,
        name: user.name,
    }, accessSecret, process.env.ACCESS_TOKEN_SECRET_EXPIRY);
};
export const verifyAccessToken = (token) => {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    if (!accessSecret) {
        throw new Error('ACCESS_TOKEN_SECRET_KEY is not configured');
    }
    const decoded = jwt.verify(token, accessSecret);
    if (typeof decoded === 'string') {
        throw new Error('Invalid token payload');
    }
    const { id, email, name } = decoded;
    if (!id || !email || !name) {
        throw new Error('Invalid token payload');
    }
    return { id, email, name };
};
