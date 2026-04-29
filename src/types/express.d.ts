import type { UserDocument } from '../models/user.model.js';

declare global {
    namespace Express {
        interface Request {
            user: UserDocument;
            token: string;
            file?: {
                path: string;
                originalname: string;
            };
        }
    }
}

export {};
