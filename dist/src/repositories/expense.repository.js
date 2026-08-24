import db from '../db/knex.js';
import { mapExpenseRow } from '../utils/mappers.js';
const EXPENSES = 'expenses';
const EXPENSE_PRODUCTS = 'expense_products';
const loadProducts = async (expenseId) => {
    return db(EXPENSE_PRODUCTS)
        .where({ expense_id: expenseId })
        .orderBy('created_at');
};
const toExpense = async (row) => {
    const products = await loadProducts(row.id);
    return mapExpenseRow(row, products);
};
export const expenseRepository = {
    async findByUserAndDate(userId, date) {
        const row = await db(EXPENSES).where({ user_id: userId, date }).first();
        if (!row)
            return null;
        return toExpense(row);
    },
    async findByUserId(userId) {
        const rows = await db(EXPENSES)
            .where({ user_id: userId })
            .orderBy('date', 'desc');
        return Promise.all(rows.map((row) => toExpense(row)));
    },
    async findByUserAndMonth(userId, month, year) {
        const pattern = `^[0-9]{2}-${month}-${year}`;
        const rows = await db(EXPENSES)
            .where({ user_id: userId })
            .whereRaw('date ~ ?', [pattern])
            .orderBy('date');
        return Promise.all(rows.map((row) => toExpense(row)));
    },
    async findLastExpense() {
        const row = await db(EXPENSES).orderBy('created_at', 'desc').first();
        if (!row)
            return null;
        return toExpense(row);
    },
    async createWithProducts(userId, date, products) {
        return db.transaction(async (trx) => {
            const [expenseRow] = await trx(EXPENSES)
                .insert({ user_id: userId, date })
                .returning('*');
            if (!expenseRow) {
                throw new Error('Failed to create expense');
            }
            const productRows = await trx(EXPENSE_PRODUCTS)
                .insert(products.map((p) => ({
                expense_id: expenseRow.id,
                name: p.name,
                price: p.price,
                category: p.category,
                label: p.label ?? null,
            })))
                .returning('*');
            return mapExpenseRow(expenseRow, productRows);
        });
    },
    async addProducts(expenseId, products) {
        const expenseRow = await db(EXPENSES).where({ id: expenseId }).first();
        if (!expenseRow)
            return null;
        await db(EXPENSE_PRODUCTS).insert(products.map((p) => ({
            expense_id: expenseId,
            name: p.name,
            price: p.price,
            category: p.category,
            label: p.label ?? null,
        })));
        return toExpense(expenseRow);
    },
    async findProductById(userId, date, productId) {
        const expense = await this.findByUserAndDate(userId, date);
        if (!expense)
            return null;
        const product = expense.products.find((p) => p._id === productId);
        if (!product)
            return null;
        return { expense, product };
    },
    async updateProduct(expenseId, productId, fields) {
        await db(EXPENSE_PRODUCTS)
            .where({ id: productId, expense_id: expenseId })
            .update({
            name: fields.name,
            price: fields.price,
            category: fields.category,
            label: fields.label ?? null,
        });
    },
    async removeProduct(expenseId, productId) {
        return db(EXPENSE_PRODUCTS).where({ id: productId, expense_id: expenseId }).delete();
    },
    async deleteExpense(expenseId) {
        await db(EXPENSES).where({ id: expenseId }).delete();
    },
    async deleteIfEmpty(expenseId) {
        const count = await db(EXPENSE_PRODUCTS).where({ expense_id: expenseId }).count('* as count');
        const productCount = Number(count[0]?.count ?? 0);
        if (productCount === 0) {
            await db(EXPENSES).where({ id: expenseId }).delete();
        }
    },
    async moveProductToDate(userId, productId, fromDate, toDate, product) {
        await db.transaction(async (trx) => {
            const fromExpense = await trx(EXPENSES)
                .where({ user_id: userId, date: fromDate })
                .first();
            if (!fromExpense)
                return;
            await trx(EXPENSE_PRODUCTS)
                .where({ id: productId, expense_id: fromExpense.id })
                .delete();
            const remaining = await trx(EXPENSE_PRODUCTS)
                .where({ expense_id: fromExpense.id })
                .count('* as count');
            if (Number(remaining[0]?.count ?? 0) === 0) {
                await trx(EXPENSES).where({ id: fromExpense.id }).delete();
            }
            const toExpense = await trx(EXPENSES)
                .where({ user_id: userId, date: toDate })
                .first();
            if (!toExpense) {
                const [newExpense] = await trx(EXPENSES)
                    .insert({ user_id: userId, date: toDate })
                    .returning('*');
                if (!newExpense)
                    return;
                await trx(EXPENSE_PRODUCTS).insert({
                    expense_id: newExpense.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    label: product.label ?? null,
                });
            }
            else {
                await trx(EXPENSE_PRODUCTS).insert({
                    expense_id: toExpense.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    label: product.label ?? null,
                });
            }
        });
    },
};
