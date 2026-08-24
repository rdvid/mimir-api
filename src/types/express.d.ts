import type { User } from './user.types.js';

declare global {
    namespace Express {
        interface Request {
            user: User;
            token: string;
            file?: {
                path: string;
                originalname: string;
            };
        }
    }
}

export {};
