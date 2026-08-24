import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/ApiError.js';
const verifyJwtToken = async (req, _res, next) => {
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
        const decodedToken = jwt.verify(token, accessSecret);
        if (!decodedToken || !decodedToken._id) {
            throw new ApiError(401, 'Token decode Error!!');
        }
        const user = await userRepository.findById(decodedToken._id);
        if (!user) {
            throw new ApiError(401, 'User not found by Access Token');
        }
        await userRepository.updateSessionLastUsed(user._id, token);
        req.user = user;
        req.token = token;
        next();
    }
    catch (error) {
        next(error);
    }
};
export default verifyJwtToken;
