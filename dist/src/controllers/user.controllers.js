import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import { userRepository } from '../repositories/user.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { OAuth2Client } from 'google-auth-library';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendMessageToUser } from '../utils/EmailSend.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { createSession, createUserAndSendVerification } from '../services/auth.service.js';
import { generateResetPasswordToken, } from '../services/token.service.js';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const getJwtPayloadWithId = (token, secret) => {
    const decodedToken = jwt.verify(token, secret);
    if (typeof decodedToken === 'string') {
        return {};
    }
    return decodedToken;
};
const hasSecureUrl = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'secure_url' in value &&
        typeof value.secure_url === 'string');
};
export const registerUser = asyncHandler(async (req, res) => {
    const { username, name, email, password } = req.body;
    if (!username?.length || !name || !email || !password) {
        throw new ApiError(400, `${name} - Your All Fields Required!!`);
    }
    const existedUser = await userRepository.existsByUsernameOrEmail(username, email);
    if (existedUser) {
        throw new ApiError(400, `${username} - User Already Exist!!`);
    }
    const createdUser = await createUserAndSendVerification(req, name, email, password);
    res.status(201).json(new ApiResponse(201, createdUser, 'User registered successfully!'));
});
export const validateAccountVerification = asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token is required!!');
    }
    const secret = process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET;
    if (!secret) {
        throw new ApiError(500, 'ACCOUNT_VERIFICATION_TOKEN_SECRET is not configured');
    }
    const decodedToken = getJwtPayloadWithId(token, secret);
    if (!decodedToken?._id) {
        throw new ApiError(400, 'Invalid token!!');
    }
    const user = await userRepository.findById(decodedToken._id);
    if (!user) {
        throw new ApiError(400, 'User not found!!');
    }
    const frontendURL = process.env.FRONTEND_URL;
    if (!frontendURL) {
        throw new ApiError(500, 'FRONTEND_URL is not configured');
    }
    if (user.isVerified) {
        res.redirect(`${frontendURL}/account-already-verified`);
        return;
    }
    await userRepository.setVerified(user._id);
    res.redirect(`${frontendURL}/account-verified`);
});
export const checkUserVerified = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(401, 'User not authenticated!!');
    }
    res.status(200).json(new ApiResponse(200, user.isVerified, 'User verified successfully!!'));
});
export const getLoggedUserData = asyncHandler(async (req, res) => {
    const user = req.user;
    const data = {
        _id: user?._id,
        username: user?.username,
        name: user?.name,
        email: user?.email,
        avatar: user?.avatar,
        isVerified: user?.isVerified,
        currentPocketMoney: user?.currentPocketMoney,
        PocketMoneyHistory: user?.PocketMoneyHistory,
        LentMoneyHistory: user?.LentMoneyHistory,
        profession: user?.profession,
        dob: user?.dateOfBirth,
        instagramLink: user?.instagramLink,
        facebookLink: user?.facebookLink,
        createdAt: user?.createdAt,
        lastLogin: user?.lastLogin,
        activeSessions: user?.activeSessions.filter((session) => session.token === req.token),
    };
    res.status(200).json(new ApiResponse(200, data, 'User Found Successfully!!'));
});
export const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password) {
        const identifier = email || username;
        throw new ApiError(400, `${identifier} - Your All Fields Required!!`);
    }
    const existedUser = await userRepository.findByEmailOrUsername(email, username, true);
    if (!existedUser) {
        throw new ApiError(400, `${email} - User does not Exist!!`);
    }
    const isPasswordValid = await userRepository.isPasswordMatch(existedUser, password);
    if (!isPasswordValid) {
        throw new ApiError(400, `${email} - Your credentials are invalid!!`);
    }
    await createSession(existedUser, req);
    const user = await userRepository.findById(existedUser._id);
    if (!user) {
        throw new ApiError(500, 'Unable to load user');
    }
    const userObj = { ...user };
    delete userObj.password;
    userObj.activeSessions = userObj.activeSessions.slice(-1);
    res.status(200).json(new ApiResponse(200, userObj, 'Login Successfully!!'));
});
export const sentTokenToResetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const existedUser = await userRepository.findByEmailOrUsername(email);
    if (!existedUser) {
        throw new ApiError(404, 'User not found');
    }
    const token = generateResetPasswordToken(existedUser._id);
    const isSentGmail = await sendMessageToUser(existedUser.name, 'RESET_PASSWORD', existedUser.email, 'Budgetter Password Reset', token);
    if (!isSentGmail) {
        throw new ApiError(500, 'Failed to send email');
    }
    return res
        .status(200)
        .json(new ApiResponse(200, 'Reset link sent successfully!!', 'Success'));
});
export const validateResetPasswordToken = asyncHandler(async (req, res) => {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token is required');
    }
    const secret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!secret) {
        throw new ApiError(500, 'RESET_PASSWORD_TOKEN_SECRET is not configured');
    }
    const decodedToken = getJwtPayloadWithId(token, secret);
    if (!decodedToken?._id) {
        throw new ApiError(400, 'Invalid token');
    }
    const frontendURL = process.env.FRONTEND_URL;
    if (!frontendURL) {
        throw new ApiError(500, 'FRONTEND_URL is not configured');
    }
    const user = await userRepository.findById(decodedToken._id);
    if (!user) {
        throw new ApiError(404, 'User not found!!');
    }
    res.redirect(`${frontendURL}/reset-password/${user._id}`);
});
export const resetPassword = asyncHandler(async (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
        throw new ApiError(400, 'All Fields are required!!');
    }
    const existedUser = await userRepository.findById(userId);
    if (!existedUser) {
        throw new ApiError(400, 'Invalid Credentials!!');
    }
    await userRepository.updatePassword(userId, newPassword);
    return res.status(201).json(new ApiResponse(201, null, 'Password updated successfully!!'));
});
export const forgotPassword = asyncHandler(async (_req, _res) => { });
export const changeAvatar = asyncHandler(async (req, res) => {
    const avatarFilePath = req.file?.path;
    if (!avatarFilePath) {
        throw new ApiError(400, 'Avatar file required!!');
    }
    const avatar = await uploadOnCloudinary(avatarFilePath);
    if (!hasSecureUrl(avatar)) {
        throw new ApiError(400, 'Failed to get url of avatar!!');
    }
    const updatedUser = await userRepository.updateFields(req.user._id, {
        avatar: avatar.secure_url,
    });
    if (!updatedUser) {
        throw new ApiError(500, 'Avatar not updated!!');
    }
    res.status(201).json(new ApiResponse(201, { avatar: updatedUser.avatar }, 'Avatar changed successfully!'));
});
export const addUserPocketMoney = asyncHandler(async (req, res) => {
    const { date, amount, source } = req.body;
    if (!date || !amount || !source) {
        throw new ApiError(400, 'Fill All Fields!!');
    }
    const user = req.user;
    const newAmount = parseFloat(user.currentPocketMoney) + parseFloat(amount);
    const updatedUser = await userRepository.addPocketMoneyEntry(user._id, { date, amount, source }, newAmount.toString());
    if (!updatedUser) {
        throw new ApiError(500, 'Failed to add pocket money');
    }
    res.status(201).json(new ApiResponse(201, {
        PocketMoneyHistory: updatedUser.PocketMoneyHistory,
        currentPocketMoney: updatedUser.currentPocketMoney,
    }, 'Pocket money added successfully!'));
});
export const changeUserCredentials = asyncHandler(async (req, res) => {
    const { name, dob, currentPassword, newPassword, instagramLink, facebookLink, profession } = req.body;
    if (!name &&
        !dob &&
        !currentPassword &&
        !newPassword &&
        !instagramLink &&
        !facebookLink &&
        !profession) {
        throw new ApiError(401, 'At least one field must be provided to update.');
    }
    const user = req.user;
    const userId = user._id;
    const updatedFields = {};
    if (name)
        updatedFields.name = name;
    if (dob)
        updatedFields.dateOfBirth = dob;
    if (instagramLink)
        updatedFields.instagramLink = instagramLink;
    if (facebookLink)
        updatedFields.facebookLink = facebookLink;
    if (profession)
        updatedFields.profession = profession;
    if (currentPassword && newPassword) {
        const userWithPassword = await userRepository.findById(userId, { includePassword: true });
        if (!userWithPassword?.password) {
            throw new ApiError(500, 'User password not found in database.');
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!isPasswordValid) {
            throw new ApiError(401, 'Current password is incorrect.');
        }
        updatedFields.password = await bcrypt.hash(newPassword, 10);
    }
    const updatedUser = await userRepository.updateFields(userId, updatedFields);
    if (!updatedUser) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200).json(new ApiResponse(200, null, 'User credentials updated successfully!'));
});
export const deleteUserAccount = asyncHandler(async (req, res) => {
    const user = req.user;
    const userId = req.user._id;
    const { password } = req.body;
    const userWithPassword = await userRepository.findById(userId, { includePassword: true });
    if (!userWithPassword) {
        throw new ApiError(404, 'User not found');
    }
    const isPasswordMatch = await userRepository.isPasswordMatch(userWithPassword, password);
    if (!isPasswordMatch) {
        throw new ApiError(404, 'Invalid Password');
    }
    const { name, username, email, avatar, currentPocketMoney } = user;
    await userRepository.deleteAccount(userId, {
        name,
        username,
        email,
        avatar,
        currentPocketMoney,
    });
    const isSentGmail = await sendMessageToUser(username, 'DELETE_ACCOUNT', email, 'Budgetter - Account Deletion Confirmation', '');
    if (!isSentGmail) {
        throw new ApiError(500, 'Failed to send account deletion confirmation email.');
    }
    res.status(200).json(new ApiResponse(200, null, 'User Account Deleted Successfully'));
});
export const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(400, 'User not exist, not logout');
    }
    await userRepository.removeSessionByToken(user._id, req.token);
    return res.status(200).json(new ApiResponse(200, null, 'Successfully Logout'));
});
export const getAllAppUsersData = asyncHandler(async (_req, res) => {
    const allUsers = await userRepository.findAll();
    const sanitized = allUsers.map((u) => {
        const { password: _password, ...rest } = { ...u, password: undefined };
        return rest;
    });
    if (sanitized.length === 0) {
        throw new ApiError(404, 'Users empty');
    }
    return res.status(200).json(new ApiResponse(200, sanitized, 'All Users Found'));
});
export const sendNewsletterToUsers = asyncHandler(async (req, res) => {
    const { emails, subject, html } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
        throw new ApiError(400, 'Emails must be a non-empty array');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
        throw new ApiError(400, `Invalid email formats: ${invalidEmails.join(', ')}`);
    }
    if (typeof subject !== 'string' || subject.trim().length === 0) {
        throw new ApiError(400, 'Subject must be a non-empty string');
    }
    if (subject.length > 50) {
        throw new ApiError(400, 'Subject cannot exceed 100 characters');
    }
    if (typeof html !== 'string' || html.trim().length === 0) {
        throw new ApiError(400, 'HTML content must be a non-empty string');
    }
    if (!html.toLowerCase().includes('<!doctype html>') &&
        !html.toLowerCase().startsWith('<html')) {
        throw new ApiError(400, 'Invalid HTML format - must start with proper HTML structure');
    }
    const isSentGmail = await sendMessageToUser(null, 'NEWSLETTER', emails, subject, null, html);
    if (!isSentGmail) {
        throw new ApiError(500, 'Failed to send newsletter emails');
    }
    return res
        .status(200)
        .json(new ApiResponse(200, null, 'Newsletter sent successfully to all users!'));
});
export const AddLentMoney = asyncHandler(async (req, res) => {
    const user = req.user;
    const { personName, price, date } = req.body;
    if (!personName || !price || !date) {
        throw new ApiError(400, 'Lent Money Fiels are empty');
    }
    const regex = /^([0-2][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    if (!regex.test(date)) {
        throw new ApiError(400, 'Invalid date format. Please use dd-mm-yyyy.');
    }
    const newPocketMoney = parseFloat(user.currentPocketMoney) - parseFloat(price);
    const updatedUser = await userRepository.addLentMoneyEntry(user._id, { personName, price, date }, newPocketMoney.toString());
    if (!updatedUser) {
        throw new ApiError(500, 'Failed to add lent money');
    }
    const totalLentMoney = updatedUser.LentMoneyHistory.reduce((total, lent) => total + parseFloat(lent.price), 0);
    res.status(201).json(new ApiResponse(201, { TotalLentMoney: totalLentMoney, currentPocketMoney: newPocketMoney }, 'Lent money successfully!'));
});
export const receivedLentMoney = asyncHandler(async (req, res) => {
    const user = req.user;
    const { lentMoneyId } = req.body;
    if (!lentMoneyId) {
        throw new ApiError(400, 'Lent Money Id cannot be empty');
    }
    const lentMoneyEntry = await userRepository.findLentMoneyEntry(user._id, lentMoneyId);
    if (!lentMoneyEntry) {
        throw new ApiError(400, 'Lent Money record not found');
    }
    const price = lentMoneyEntry.price;
    const newPocketMoney = parseFloat(user.currentPocketMoney) + parseFloat(price);
    const removed = await userRepository.removeLentMoneyEntry(user._id, lentMoneyId, newPocketMoney.toString());
    if (!removed) {
        throw new ApiError(404, 'Lent money record not found');
    }
    res.status(201).json(new ApiResponse(201, { currentPocketMoney: newPocketMoney }, 'Lent Deleted and money added successfully!'));
});
export const getAllLentMoneyHistory = asyncHandler(async (req, res) => {
    const user = req.user;
    res.status(200).json(new ApiResponse(200, { LentMoneyHistory: user.LentMoneyHistory }, 'All Lent Money Found Successfully'));
});
export const SignWithGoogleAuthentication = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        throw new ApiError(400, 'Token cannot be empty');
    }
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.name || !payload?.sub) {
        throw new ApiError(400, 'Invalid Google token payload');
    }
    const { sub: googleId, email, name, picture } = payload;
    let existedUser = await userRepository.findByGoogleIdOrEmail(googleId, email);
    if (!existedUser) {
        const createdUser = await createUserAndSendVerification(req, name, email, null, googleId, picture);
        return res
            .status(201)
            .json(new ApiResponse(201, createdUser, 'User registered successfully!'));
    }
    await createSession(existedUser, req);
    const loggedInUser = await userRepository.findById(existedUser._id);
    return res
        .status(200)
        .json(new ApiResponse(200, loggedInUser, 'Login Successfully!!'));
});
export const getAllActiveSessions = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(401, 'User not authenticated');
    }
    const activeSessions = user.activeSessions.map((session) => ({
        _id: session._id,
        ip: session.ip,
        userAgent: session.userAgent,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    }));
    if (!activeSessions || activeSessions.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], 'No active sessions found'));
    }
    return res
        .status(200)
        .json(new ApiResponse(200, activeSessions, 'Active sessions retrieved successfully'));
});
export const deleteActiveSession = asyncHandler(async (req, res) => {
    const user = req.user;
    const { sessionId } = req.body;
    if (!user) {
        throw new ApiError(401, 'User not authenticated');
    }
    if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
    }
    const sessionToDelete = user.activeSessions.find((session) => session._id === sessionId);
    if (!sessionToDelete) {
        throw new ApiError(404, 'Session not found');
    }
    await userRepository.removeSessionById(user._id, sessionId);
    return res.status(200).json(new ApiResponse(200, null, 'Session deleted successfully'));
});
export const deleteAllActiveSessions = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(401, 'User not authenticated');
    }
    await userRepository.removeAllSessions(user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, null, 'All other active sessions deleted successfully'));
});
