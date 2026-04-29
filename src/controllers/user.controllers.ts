import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import asyncHandler from '../utils/asyncHandler.js';
import ExpenseModel from '../models/expenses.model.js';
import deletedUser from '../models/deletedUser.model.js';

import { ApiError } from '../utils/ApiError.js';
import { OAuth2Client } from 'google-auth-library';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendMessageToUser } from '../utils/EmailSend.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import UserModel, { type ActiveSession, type User } from '../models/user.model.js';
import { createSession, createUserAndSendVerification } from '../services/auth.service.js';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface JwtPayloadWithId {
    _id?: string;
}

interface RegisterBody {
    username: string;
    name: string;
    email: string;
    password: string;
}

interface LoginBody {
    username?: string;
    email?: string;
    password: string;
}

interface EmailBody {
    email: string;
}

interface ResetPasswordBody {
    userId: string;
    newPassword: string;
}

interface AddPocketMoneyBody {
    date: string;
    amount: string;
    source: string;
}

interface ChangeUserCredentialsBody {
    name?: string;
    dob?: string;
    currentPassword?: string;
    newPassword?: string;
    instagramLink?: string;
    facebookLink?: string;
    profession?: string;
}

interface DeleteAccountBody {
    password: string;
}

interface NewsletterBody {
    emails: string[];
    subject: string;
    html: string;
}

interface AddLentMoneyBody {
    personName: string;
    price: string;
    date: string;
}

interface ReceiveLentMoneyBody {
    lentMoneyId: string;
}

interface GoogleLoginBody {
    token: string;
}

interface DeleteSessionBody {
    sessionId: string;
}

const getJwtPayloadWithId = (token: string, secret: string): JwtPayloadWithId => {
    const decodedToken = jwt.verify(token, secret);
    if (typeof decodedToken === 'string') {
        return {};
    }
    return decodedToken as JwtPayloadWithId;
};

const hasSecureUrl = (value: unknown): value is { secure_url: string } => {
    return (
        typeof value === 'object' &&
        value !== null &&
        'secure_url' in value &&
        typeof value.secure_url === 'string'
    );
};

export const registerUser = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, RegisterBody>, res: Response) => {
        const { username, name, email, password } = req.body;
        if (!username?.length || !name || !email || !password) {
            throw new ApiError(400, `${name} - Your All Fields Required!!`);
        }

        const existedUser = await UserModel.findOne({
            $or: [{ username }, { email }],
        });
        if (existedUser) {
            throw new ApiError(400, `${username} - User Already Exist!!`);
        }

        const createdUser = await createUserAndSendVerification(req, name, email, password);
        res.status(201).json(new ApiResponse(201, createdUser, 'User registered successfully!'));
    },
);

export const validateAccountVerification = asyncHandler(async (req: Request, res: Response) => {
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
    const user = await UserModel.findById(decodedToken._id);
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
    user.isVerified = true;
    await user.save({ validateBeforeSave: false });
    res.redirect(`${frontendURL}/account-verified`);
});

export const checkUserVerified = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(401, 'User not authenticated!!');
    }
    res.status(200).json(new ApiResponse(200, user.isVerified, 'User verified successfully!!'));
});

export const getLoggedUserData = asyncHandler(async (req: Request, res: Response) => {
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
        activeSessions: user?.activeSessions.filter(
            (session: ActiveSession) => session.token === req.token,
        ),
    };
    res.status(200).json(new ApiResponse(200, data, 'User Found Successfully!!'));
});

export const loginUser = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, LoginBody>, res: Response) => {
        const { username, email, password } = req.body;
        if ((!username && !email) || !password) {
            const identifier = email || username;
            throw new ApiError(400, `${identifier} - Your All Fields Required!!`);
        }

        const existedUser = await UserModel.findOne({
            $or: [{ email }, { username }],
        }).select('+password');
        if (!existedUser) {
            throw new ApiError(400, `${email} - User does not Exist!!`);
        }

        const isPasswordValid = await existedUser.isPasswordMatch(password);
        if (!isPasswordValid) {
            throw new ApiError(400, `${email} - Your credentials are invalid!!`);
        }

        await createSession(existedUser, req);
        const user = await UserModel.findById(existedUser._id).select('-password');
        const userObj = user?.toObject();
        if (!userObj) {
            throw new ApiError(500, 'Unable to load user');
        }
        userObj.activeSessions = userObj.activeSessions.slice(-1);

        res.status(200).json(new ApiResponse(200, userObj, 'Login Successfully!!'));
    },
);

export const sentTokenToResetPassword = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, EmailBody>, res: Response) => {
        const { email } = req.body;
        const existedUser = await UserModel.findOne({ email });
        if (!existedUser) {
            throw new ApiError(404, 'User not found');
        }

        const resetSecret = process.env.RESET_PASSWORD_TOKEN_SECRET;
        if (!resetSecret) {
            throw new ApiError(500, 'RESET_PASSWORD_TOKEN_SECRET is not configured');
        }

        const token = jwt.sign({ _id: existedUser._id }, resetSecret, {
            expiresIn: process.env.RESET_PASSWORD_TOKEN_SECRET_EXPIRY,
        });

        const isSentGmail = await sendMessageToUser(
            existedUser.name,
            'RESET_PASSWORD',
            existedUser.email,
            'Budgetter Password Reset',
            token,
        );
        if (!isSentGmail) {
            throw new ApiError(500, 'Failed to send email');
        }
        return res
            .status(200)
            .json(new ApiResponse(200, 'Reset link sent successfully!!', 'Success'));
    },
);

export const validateResetPasswordToken = asyncHandler(async (req: Request, res: Response) => {
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

    const user = await UserModel.findById(decodedToken._id).select('_id');
    if (!user) {
        throw new ApiError(404, 'User not found!!');
    }
    res.redirect(`${frontendURL}/reset-password/${user._id}`);
});

export const resetPassword = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, ResetPasswordBody>, res: Response) => {
        const { userId, newPassword } = req.body;
        if (!userId || !newPassword) {
            throw new ApiError(400, 'All Fields are required!!');
        }

        const existedUser = await UserModel.findById(userId);
        if (!existedUser) {
            throw new ApiError(400, 'Invalid Credentials!!');
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await UserModel.findByIdAndUpdate(
            { _id: existedUser._id },
            { $set: { password: hashPassword } },
            { new: true },
        );
        if (!updatedUser) {
            throw new ApiError(500, 'Something went wrong!!');
        }
        return res.status(201).json(new ApiResponse(201, null, 'Password updated successfully!!'));
    },
);

export const forgotPassword = asyncHandler(async (_req: Request, _res: Response) => {});

export const changeAvatar = asyncHandler(async (req: Request, res: Response) => {
    const avatarFilePath = req.file?.path;
    if (!avatarFilePath) {
        throw new ApiError(400, 'Avatar file required!!');
    }
    const avatar = await uploadOnCloudinary(avatarFilePath);
    if (!hasSecureUrl(avatar)) {
        throw new ApiError(400, 'Failed to get url of avatar!!');
    }
    const updatedUser = (await UserModel.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.secure_url,
            },
        },
        { new: true },
    ).select('avatar')) as Pick<User, 'avatar'> | null;
    if (!updatedUser) {
        throw new ApiError(500, 'Avatar not updated!!');
    }
    res.status(201).json(new ApiResponse(201, updatedUser, 'Avatar changed successfully!'));
});

export const addUserPocketMoney = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, AddPocketMoneyBody>, res: Response) => {
        const { date, amount, source } = req.body;
        if (!date || !amount || !source) {
            throw new ApiError(400, 'Fill All Fields!!');
        }
        const user = req.user;
        const newAmount = parseFloat(user.currentPocketMoney) + parseFloat(amount);
        user.PocketMoneyHistory.push({
            date,
            amount,
            source,
        });
        user.currentPocketMoney = newAmount.toString();

        await user.save();
        res.status(201).json(
            new ApiResponse(
                201,
                {
                    PocketMoneyHistory: user.PocketMoneyHistory,
                    currentPocketMoney: user.currentPocketMoney,
                },
                'Pocket money added successfully!',
            ),
        );
    },
);

export const changeUserCredentials = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, ChangeUserCredentialsBody>, res: Response) => {
        const { name, dob, currentPassword, newPassword, instagramLink, facebookLink, profession } =
            req.body;

        if (
            !name &&
            !dob &&
            !currentPassword &&
            !newPassword &&
            !instagramLink &&
            !facebookLink &&
            !profession
        ) {
            throw new ApiError(401, 'At least one field must be provided to update.');
        }

        const user = req.user;
        const userId = user._id;
        const updatedFields: Partial<User> = {};

        if (name) updatedFields.name = name;
        if (dob) updatedFields.dateOfBirth = dob;
        if (instagramLink) updatedFields.instagramLink = instagramLink;
        if (facebookLink) updatedFields.facebookLink = facebookLink;
        if (profession) updatedFields.profession = profession;

        if (currentPassword && newPassword) {
            if (!user.password) {
                throw new ApiError(500, 'User password not found in database.');
            }
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new ApiError(401, 'Current password is incorrect.');
            }
            updatedFields.password = await bcrypt.hash(newPassword, 10);
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { $set: updatedFields },
            { new: true },
        );
        if (!updatedUser) {
            throw new ApiError(404, 'User not found');
        }
        res.status(200).json(new ApiResponse(200, null, 'User credentials updated successfully!'));
    },
);

export const deleteUserAccount = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, DeleteAccountBody>, res: Response) => {
        const user = req.user;
        const userId = req.user._id;
        const { password } = req.body;

        const isPasswordMatch = await user?.isPasswordMatch(password);
        if (!isPasswordMatch) {
            throw new ApiError(404, 'Invalid Password');
        }

        const { name, username, email, avatar, currentPocketMoney } = user;
        const deleteUserDetails = {
            name,
            username,
            email,
            avatar,
            currentPocketMoney,
        };

        await ExpenseModel.deleteMany({ user: userId });
        await UserModel.deleteOne({ _id: userId });
        await deletedUser.create(deleteUserDetails);

        const isSentGmail = await sendMessageToUser(
            username,
            'DELETE_ACCOUNT',
            email,
            'Budgetter - Account Deletion Confirmation',
            '',
        );
        if (!isSentGmail) {
            throw new ApiError(500, 'Failed to send account deletion confirmation email.');
        }

        res.status(200).json(new ApiResponse(200, null, 'User Account Deleted Successfully'));
    },
);

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(400, 'User not exist, not logout');
    }

    user.activeSessions = user.activeSessions.filter(
        (session: ActiveSession) => session.token !== req.token,
    );
    await user.save();
    return res.status(200).json(new ApiResponse(200, null, 'Successfully Logout'));
});

export const getAllAppUsersData = asyncHandler(async (_req: Request, res: Response) => {
    const allUsers = await UserModel.find().select('-password -accessToken');
    if (!allUsers) {
        throw new ApiError(404, 'Users empty');
    }
    return res.status(200).json(new ApiResponse(200, allUsers, 'All Users Found'));
});

export const sendNewsletterToUsers = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, NewsletterBody>, res: Response) => {
        const { emails, subject, html } = req.body;

        if (!Array.isArray(emails) || emails.length === 0) {
            throw new ApiError(400, 'Emails must be a non-empty array');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));
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
        if (
            !html.toLowerCase().includes('<!doctype html>') &&
            !html.toLowerCase().startsWith('<html')
        ) {
            throw new ApiError(400, 'Invalid HTML format - must start with proper HTML structure');
        }

        const isSentGmail = await sendMessageToUser(
            null,
            'NEWSLETTER',
            emails,
            subject,
            null,
            html,
        );
        if (!isSentGmail) {
            throw new ApiError(500, 'Failed to send newsletter emails');
        }

        return res
            .status(200)
            .json(new ApiResponse(200, null, 'Newsletter sent successfully to all users!'));
    },
);

export const AddLentMoney = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, AddLentMoneyBody>, res: Response) => {
        const user = req.user;
        const { personName, price, date } = req.body;
        if (!personName || !price || !date) {
            throw new ApiError(400, 'Lent Money Fiels are empty');
        }
        const regex = /^([0-2][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
        if (!regex.test(date)) {
            throw new ApiError(400, 'Invalid date format. Please use dd-mm-yyyy.');
        }

        user.LentMoneyHistory.push({
            personName,
            price,
            date,
        });

        const newPocketMoney = parseFloat(user.currentPocketMoney) - parseFloat(price);
        user.currentPocketMoney = newPocketMoney.toString();

        const totalLentMoney = user.LentMoneyHistory.reduce(
            (total: number, lent: { price: string }) => total + parseFloat(lent.price),
            0,
        );
        await user.save();
        res.status(201).json(
            new ApiResponse(
                201,
                { TotalLentMoney: totalLentMoney, currentPocketMoney: newPocketMoney },
                'Lent money successfully!',
            ),
        );
    },
);

export const receivedLentMoney = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, ReceiveLentMoneyBody>, res: Response) => {
        const user = req.user;
        const { lentMoneyId } = req.body;

        if (!lentMoneyId) {
            throw new ApiError(400, 'Lent Money Id cannot be empty');
        }

        const lentMoneyObject = await UserModel.findOne(
            { _id: user._id },
            { LentMoneyHistory: { $elemMatch: { _id: lentMoneyId } } },
        );

        if (!lentMoneyObject || lentMoneyObject.LentMoneyHistory.length === 0) {
            throw new ApiError(400, 'Lent Money record not found');
        }

        const lentMoneyEntry = lentMoneyObject.LentMoneyHistory[0];
        if (!lentMoneyEntry) {
            throw new ApiError(400, 'Lent Money record not found');
        }
        const price = lentMoneyEntry.price;

        const result = await UserModel.updateOne(
            { _id: user._id, 'LentMoneyHistory._id': lentMoneyId },
            {
                $pull: {
                    LentMoneyHistory: { _id: lentMoneyId },
                },
            },
        );

        if (result.modifiedCount === 0) {
            throw new ApiError(404, 'Lent money record not found');
        }

        const newPocketMoney = parseFloat(user.currentPocketMoney) + parseFloat(price);
        user.currentPocketMoney = newPocketMoney.toString();
        await user.save();

        res.status(201).json(
            new ApiResponse(
                201,
                { currentPocketMoney: newPocketMoney },
                'Lent Deleted and money added successfully!',
            ),
        );
    },
);

export const getAllLentMoneyHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    res.status(200).json(
        new ApiResponse(
            200,
            { LentMoneyHistory: user.LentMoneyHistory },
            'All Lent Money Found Successfully',
        ),
    );
});

export const SignWithGoogleAuthentication = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, GoogleLoginBody>, res: Response) => {
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
        let existedUser = await UserModel.findOne({
            $or: [{ googleId }, { email }],
        });

        if (!existedUser) {
            const createdUser = await createUserAndSendVerification(
                req,
                name,
                email,
                null,
                googleId,
                picture,
            );
            return res
                .status(201)
                .json(new ApiResponse(201, createdUser, 'User registered successfully!'));
        }

        await createSession(existedUser, req);
        return res.status(200).json(new ApiResponse(200, existedUser, 'Login Successfully!!'));
    },
);

export const getAllActiveSessions = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new ApiError(401, 'User not authenticated');
    }

    const activeSessions = user.activeSessions.map((session: ActiveSession) => ({
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

export const deleteActiveSession = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, DeleteSessionBody>, res: Response) => {
        const user = req.user;
        const { sessionId } = req.body;

        if (!user) {
            throw new ApiError(401, 'User not authenticated');
        }

        if (!sessionId) {
            throw new ApiError(400, 'Session ID is required');
        }

        const sessionToDelete = user.activeSessions.find(
            (session: ActiveSession) => session._id?.toString() === sessionId,
        );
        if (!sessionToDelete) {
            throw new ApiError(404, 'Session not found');
        }

        user.activeSessions = user.activeSessions.filter(
            (session: ActiveSession) => session._id?.toString() !== sessionId,
        );
        await user.save();

        return res.status(200).json(new ApiResponse(200, null, 'Session deleted successfully'));
    },
);

export const deleteAllActiveSessions = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new ApiError(401, 'User not authenticated');
    }
    user.activeSessions = [];
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, null, 'All other active sessions deleted successfully'));
});
