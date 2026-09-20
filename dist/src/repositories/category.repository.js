import db from '../db/knex.js';
import { mapCategoryRow } from '../utils/mappers.js';
const CATEGORIES = 'categories';
export const DEFAULT_CATEGORIES = [
    'Groceries',
    'Housing',
    'Transport',
    'Food',
    'Personal',
    'Health',
    'Income',
    'Other',
];
export const categoryRepository = {
    async findByUserId(userId) {
        const rows = await db(CATEGORIES)
            .where({ user_id: userId })
            .orderBy('name', 'asc');
        return rows.map(mapCategoryRow);
    },
    async findByIdForUser(id, userId) {
        const row = await db(CATEGORIES).where({ id, user_id: userId }).first();
        return row ? mapCategoryRow(row) : null;
    },
    async create(input) {
        const [row] = await db(CATEGORIES)
            .insert({
            user_id: input.userId,
            name: input.name.trim(),
        })
            .returning('*');
        if (!row) {
            throw new Error('Failed to create category');
        }
        return mapCategoryRow(row);
    },
    async seedDefaults(userId) {
        const rows = await db(CATEGORIES)
            .insert(DEFAULT_CATEGORIES.map((name) => ({
            user_id: userId,
            name,
        })))
            .returning('*');
        return rows.map(mapCategoryRow);
    },
};
