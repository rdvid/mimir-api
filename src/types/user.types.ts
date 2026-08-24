export interface PocketMoneyHistoryItem {
    _id: string;
    date: string;
    amount: string;
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LentMoneyHistoryItem {
    _id: string;
    personName: string;
    price: string;
    date: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ActiveSession {
    _id: string;
    token: string;
    ip: string;
    userAgent: string;
    lastUsedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface User {
    _id: string;
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
    activeSessions: ActiveSession[];
    isVerified: boolean;
    lastLogin?: Date | null;
    currentLogin?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserRow {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string;
    date_of_birth: string;
    profession: string;
    instagram_link: string;
    facebook_link: string;
    current_pocket_money: string;
    password: string | null;
    google_id: string | null;
    auth_provider: 'google' | 'local';
    is_verified: boolean;
    last_login: Date | null;
    current_login: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface PocketMoneyHistoryRow {
    id: string;
    user_id: string;
    date: string;
    amount: string;
    source: string;
    created_at: Date;
    updated_at: Date;
}

export interface LentMoneyHistoryRow {
    id: string;
    user_id: string;
    person_name: string;
    price: string;
    date: string;
    created_at: Date;
    updated_at: Date;
}

export interface ActiveSessionRow {
    id: string;
    user_id: string;
    token: string;
    ip: string;
    user_agent: string;
    last_used_at: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    username: string;
    name: string;
    email: string;
    password?: string;
    googleId?: string;
    authProvider?: 'google' | 'local';
    avatar?: string;
}

export interface DeletedUserInput {
    username: string;
    name: string;
    email: string;
    avatar: string;
    currentPocketMoney: string;
}
