import bcrypt from 'bcrypt';
import db from '../db/knex.js';
import { mapUserRow } from '../utils/mappers.js';
const USERS = 'users';
export const userRepository = {
    async findById(id) {
        const row = await db(USERS).where({ id }).first();
        return row ? mapUserRow(row) : null;
    },
    async findByEmail(email) {
        const row = await db(USERS).where({ email: email.toLowerCase() }).first();
        if (!row)
            return null;
        return { ...mapUserRow(row), password: row.password };
    },
    async create(input) {
        const hashedPassword = await bcrypt.hash(input.password, 10);
        const [row] = await db(USERS)
            .insert({
            email: input.email.toLowerCase(),
            password: hashedPassword,
            name: input.name,
        })
            .returning('*');
        if (!row) {
            throw new Error('Failed to create user');
        }
        return mapUserRow(row);
    },
    async isPasswordMatch(hashedPassword, password) {
        return bcrypt.compare(password, hashedPassword);
    },
};
