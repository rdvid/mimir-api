import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export interface PocketMoneyHistoryItem {
    date: string;
    amount: string;
    source: string;
}

export interface LentMoneyHistoryItem {
    personName: string;
    price: string;
    date: string;
}

export interface ActiveSession {
    _id?: mongoose.Types.ObjectId;
    token: string;
    ip: string;
    userAgent: string;
    lastUsedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface User {
    _id: mongoose.Types.ObjectId;
    username: string;
    name: string;
    email: string;
    avatar: string;
    dateOfBirth?: string;
    profession?: string;
    instagramLink?: string;
    facebookLink?: string;
    PocketMoneyHistory: PocketMoneyHistoryItem[];
    LentMoneyHistory: LentMoneyHistoryItem[];
    currentPocketMoney: string;
    password?: string;
    googleId?: string | null;
    authProvider: 'google' | 'local';
    accessToken?: string;
    activeSessions: ActiveSession[];
    isVerified: boolean;
    lastLogin?: Date | null;
    currentLogin?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserMethods {
    isPasswordMatch(password: string): Promise<boolean>;
    generateAccessToken(): Promise<string>;
    generateResetPasswordToken(): Promise<string>;
    generateAccountVerificationToken(): Promise<string>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;
type UserModelType = Model<User, Record<string, never>, UserMethods>;

const PocketMoneyHistorySchema = new Schema<PocketMoneyHistoryItem>(
    {
        date: {
            type: String,
            required: true,
            default: () => {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                return `${day}-${month}-${year}`;
            },
        },
        amount: {
            type: String,
            required: true,
        },
        source: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

const LentMoneyHistorySchema = new Schema<LentMoneyHistoryItem>(
    {
        personName: {
            type: String,
            required: true,
        },
        price: {
            type: String,
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

const activeSessionsSchema = new Schema<ActiveSession>(
    {
        token: {
            type: String,
            required: true,
        },
        ip: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            required: true,
        },
        lastUsedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    },
);

const UserSchema = new Schema<User, UserModelType, UserMethods>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        avatar: {
            type: String,
            default: 'https://i.postimg.cc/cCWKmfzs/satoro-1.jpg',
        },
        dateOfBirth: {
            type: String,
            default: '',
            required: false,
        },
        profession: {
            type: String,
            default: '',
            required: false,
        },
        instagramLink: {
            type: String,
            default: '',
            required: false,
        },
        facebookLink: {
            type: String,
            default: '',
            required: false,
        },
        PocketMoneyHistory: {
            type: [PocketMoneyHistorySchema],
            default: [],
        },
        LentMoneyHistory: {
            type: [LentMoneyHistorySchema],
            default: [],
        },
        currentPocketMoney: {
            type: String,
            default: '0',
        },
        password: {
            type: String,
            required: function (this: { authProvider: 'google' | 'local' }): boolean {
                return this.authProvider === 'local';
            },
        },
        googleId: {
            type: String,
            default: null,
        },
        authProvider: {
            type: String,
            enum: ['google', 'local'],
            required: true,
            default: 'local',
        },
        accessToken: {
            type: String,
            default: undefined,
        },
        activeSessions: {
            type: [activeSessionsSchema],
            default: [],
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        currentLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

UserSchema.pre('save', async function (this: UserDocument, next: () => void): Promise<void> {
    if (!this.isModified('password')) {
        return next();
    }
    if (!this.password) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isPasswordMatch = async function (
    this: UserDocument,
    password: string,
): Promise<boolean> {
    return bcrypt.compare(password, this.password ?? '');
};

UserSchema.methods.generateAccessToken = async function (this: UserDocument): Promise<string> {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    if (!accessSecret) {
        throw new Error('ACCESS_TOKEN_SECRET_KEY is not configured');
    }

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name,
        },
        accessSecret,
        {
            expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRY,
        },
    );
};

UserSchema.methods.generateResetPasswordToken = async function (
    this: UserDocument,
): Promise<string> {
    const resetSecret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!resetSecret) {
        throw new Error('RESET_PASSWORD_TOKEN_SECRET is not configured');
    }

    return jwt.sign(
        {
            _id: this._id,
        },
        resetSecret,
        {
            expiresIn: process.env.RESET_PASSWORD_TOKEN_SECRET_EXPIRY,
        },
    );
};

UserSchema.methods.generateAccountVerificationToken = async function (
    this: UserDocument,
): Promise<string> {
    const verificationSecret = process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET;
    if (!verificationSecret) {
        throw new Error('ACCOUNT_VERIFICATION_TOKEN_SECRET is not configured');
    }

    return jwt.sign(
        {
            _id: this._id,
        },
        verificationSecret,
        {
            expiresIn: process.env.ACCOUNT_VERIFICATION_TOKEN_SECRET_EXPIRY,
        },
    );
};

const UserModel = mongoose.model<User, UserModelType>('User', UserSchema);
export default UserModel;
