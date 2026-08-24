import bcrypt from 'bcrypt';
import db from '../db/knex.js';
import { mapUserRow } from '../utils/mappers.js';
import type {
    ActiveSessionRow,
    CreateUserInput,
    DeletedUserInput,
    LentMoneyHistoryRow,
    PocketMoneyHistoryRow,
    User,
    UserRow,
} from '../types/user.types.js';

const USERS = 'users';
const POCKET_MONEY = 'pocket_money_history';
const LENT_MONEY = 'lent_money_history';
const SESSIONS = 'active_sessions';
const DELETED_USERS = 'deleted_users';

const loadUserChildren = async (userId: string) => {
    const [pocketMoney, lentMoney, sessions] = await Promise.all([
        db<PocketMoneyHistoryRow>(POCKET_MONEY).where({ user_id: userId }).orderBy('created_at'),
        db<LentMoneyHistoryRow>(LENT_MONEY).where({ user_id: userId }).orderBy('created_at'),
        db<ActiveSessionRow>(SESSIONS).where({ user_id: userId }).orderBy('created_at'),
    ]);
    return { pocketMoney, lentMoney, sessions };
};

const toUser = async (row: UserRow, includePassword = false): Promise<User> => {
    const children = await loadUserChildren(row.id);
    return mapUserRow(row, children.pocketMoney, children.lentMoney, children.sessions, includePassword);
};

export const userRepository = {
    async findById(id: string, options?: { includePassword?: boolean }): Promise<User | null> {
        const row = await db<UserRow>(USERS).where({ id }).first();
        if (!row) return null;
        return toUser(row, options?.includePassword ?? false);
    },

    async findByEmailOrUsername(
        email?: string,
        username?: string,
        includePassword = false,
    ): Promise<User | null> {
        let query = db<UserRow>(USERS);
        if (email && username) {
            query = query.where({ email }).orWhere({ username });
        } else if (email) {
            query = query.where({ email });
        } else if (username) {
            query = query.where({ username });
        } else {
            return null;
        }

        const row = await query.first();
        if (!row) return null;
        return toUser(row, includePassword);
    },

    async findByGoogleIdOrEmail(googleId: string, email: string): Promise<User | null> {
        const row = await db<UserRow>(USERS)
            .where({ google_id: googleId })
            .orWhere({ email })
            .first();
        if (!row) return null;
        return toUser(row);
    },

    async existsByUsername(username: string): Promise<boolean> {
        const row = await db<UserRow>(USERS).where({ username }).first();
        return row !== undefined;
    },

    async existsByUsernameOrEmail(username: string, email: string): Promise<boolean> {
        const row = await db<UserRow>(USERS)
            .where({ username })
            .orWhere({ email })
            .first();
        return row !== undefined;
    },

    async create(input: CreateUserInput): Promise<User> {
        const hashedPassword = input.password ? await bcrypt.hash(input.password, 10) : null;

        const [row] = await db<UserRow>(USERS)
            .insert({
                username: input.username,
                name: input.name,
                email: input.email.toLowerCase(),
                password: hashedPassword,
                google_id: input.googleId ?? null,
                auth_provider: input.authProvider ?? (input.googleId ? 'google' : 'local'),
                avatar: input.avatar,
            })
            .returning('*');

        if (!row) {
            throw new Error('Failed to create user');
        }

        return mapUserRow(row);
    },

    async updateFields(
        userId: string,
        fields: Partial<{
            name: string;
            dateOfBirth: string;
            profession: string;
            instagramLink: string;
            facebookLink: string;
            password: string;
            avatar: string;
            currentPocketMoney: string;
            isVerified: boolean;
            lastLogin: Date | null;
            currentLogin: Date | null;
        }>,
    ): Promise<User | null> {
        const updateData: Record<string, unknown> = {};

        if (fields.name !== undefined) updateData.name = fields.name;
        if (fields.dateOfBirth !== undefined) updateData.date_of_birth = fields.dateOfBirth;
        if (fields.profession !== undefined) updateData.profession = fields.profession;
        if (fields.instagramLink !== undefined) updateData.instagram_link = fields.instagramLink;
        if (fields.facebookLink !== undefined) updateData.facebook_link = fields.facebookLink;
        if (fields.password !== undefined) updateData.password = fields.password;
        if (fields.avatar !== undefined) updateData.avatar = fields.avatar;
        if (fields.currentPocketMoney !== undefined)
            updateData.current_pocket_money = fields.currentPocketMoney;
        if (fields.isVerified !== undefined) updateData.is_verified = fields.isVerified;
        if (fields.lastLogin !== undefined) updateData.last_login = fields.lastLogin;
        if (fields.currentLogin !== undefined) updateData.current_login = fields.currentLogin;

        if (Object.keys(updateData).length === 0) {
            return this.findById(userId);
        }

        const [row] = await db<UserRow>(USERS).where({ id: userId }).update(updateData).returning('*');
        if (!row) return null;
        return toUser(row);
    },

    async updatePassword(userId: string, newPassword: string): Promise<void> {
        const hashPassword = await bcrypt.hash(newPassword, 10);
        await db(USERS).where({ id: userId }).update({ password: hashPassword });
    },

    async setVerified(userId: string): Promise<void> {
        await db(USERS).where({ id: userId }).update({ is_verified: true });
    },

    async addPocketMoneyEntry(
        userId: string,
        entry: { date: string; amount: string; source: string },
        newBalance: string,
    ): Promise<User | null> {
        await db.transaction(async (trx) => {
            await trx(POCKET_MONEY).insert({
                user_id: userId,
                date: entry.date,
                amount: entry.amount,
                source: entry.source,
            });
            await trx(USERS).where({ id: userId }).update({ current_pocket_money: newBalance });
        });
        return this.findById(userId);
    },

    async addLentMoneyEntry(
        userId: string,
        entry: { personName: string; price: string; date: string },
        newBalance: string,
    ): Promise<User | null> {
        await db.transaction(async (trx) => {
            await trx(LENT_MONEY).insert({
                user_id: userId,
                person_name: entry.personName,
                price: entry.price,
                date: entry.date,
            });
            await trx(USERS).where({ id: userId }).update({ current_pocket_money: newBalance });
        });
        return this.findById(userId);
    },

    async findLentMoneyEntry(userId: string, lentMoneyId: string): Promise<{ price: string } | null> {
        const row = await db<LentMoneyHistoryRow>(LENT_MONEY)
            .where({ id: lentMoneyId, user_id: userId })
            .first();
        if (!row) return null;
        return { price: row.price };
    },

    async removeLentMoneyEntry(userId: string, lentMoneyId: string, newBalance: string): Promise<boolean> {
        const deleted = await db.transaction(async (trx) => {
            const count = await trx(LENT_MONEY)
                .where({ id: lentMoneyId, user_id: userId })
                .delete();
            if (count === 0) return false;
            await trx(USERS).where({ id: userId }).update({ current_pocket_money: newBalance });
            return true;
        });
        return deleted;
    },

    async updateCurrentPocketMoney(userId: string, balance: string): Promise<void> {
        await db(USERS).where({ id: userId }).update({ current_pocket_money: balance });
    },

    async addSession(
        userId: string,
        session: { token: string; ip: string; userAgent: string },
        loginTimestamps: { lastLogin: Date | null; currentLogin: Date },
    ): Promise<void> {
        await db.transaction(async (trx) => {
            await trx(SESSIONS).insert({
                user_id: userId,
                token: session.token,
                ip: session.ip,
                user_agent: session.userAgent,
                last_used_at: new Date(),
            });
            await trx(USERS)
                .where({ id: userId })
                .update({
                    last_login: loginTimestamps.lastLogin,
                    current_login: loginTimestamps.currentLogin,
                });
        });
    },

    async updateSessionLastUsed(userId: string, token: string): Promise<void> {
        await db(SESSIONS)
            .where({ user_id: userId, token })
            .update({ last_used_at: new Date() });
    },

    async removeSessionByToken(userId: string, token: string): Promise<void> {
        await db(SESSIONS).where({ user_id: userId, token }).delete();
    },

    async removeSessionById(userId: string, sessionId: string): Promise<boolean> {
        const count = await db(SESSIONS).where({ id: sessionId, user_id: userId }).delete();
        return count > 0;
    },

    async removeAllSessions(userId: string): Promise<void> {
        await db(SESSIONS).where({ user_id: userId }).delete();
    },

    async findAll(): Promise<User[]> {
        const rows = await db<UserRow>(USERS).select('*');
        return Promise.all(rows.map((row) => toUser(row)));
    },

    async deleteAccount(userId: string, deletedUserData: DeletedUserInput): Promise<void> {
        await db.transaction(async (trx) => {
            await trx(DELETED_USERS).insert({
                username: deletedUserData.username,
                name: deletedUserData.name,
                email: deletedUserData.email,
                avatar: deletedUserData.avatar,
                current_pocket_money: deletedUserData.currentPocketMoney,
            });
            await trx(USERS).where({ id: userId }).delete();
        });
    },

    async isPasswordMatch(user: User, password: string): Promise<boolean> {
        if (!user.password) return false;
        return bcrypt.compare(password, user.password);
    },
};
