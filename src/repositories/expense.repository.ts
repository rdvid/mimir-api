import db from '../db/knex.js';
import { mapExpenseRow } from '../utils/mappers.js';
import type {
    Expense,
    ExpenseProductRow,
    ExpenseRow,
    Product,
    ProductInput,
} from '../types/expense.types.js';

const EXPENSES = 'expenses';
const EXPENSE_PRODUCTS = 'expense_products';

const loadProducts = async (expenseId: string): Promise<ExpenseProductRow[]> => {
    return db<ExpenseProductRow>(EXPENSE_PRODUCTS)
        .where({ expense_id: expenseId })
        .orderBy('created_at');
};

const toExpense = async (row: ExpenseRow): Promise<Expense> => {
    const products = await loadProducts(row.id);
    return mapExpenseRow(row, products);
};

export const expenseRepository = {
    async findByUserAndDate(userId: string, date: string): Promise<Expense | null> {
        const row = await db<ExpenseRow>(EXPENSES).where({ user_id: userId, date }).first();
        if (!row) return null;
        return toExpense(row);
    },

    async findByUserId(userId: string): Promise<Expense[]> {
        const rows = await db<ExpenseRow>(EXPENSES)
            .where({ user_id: userId })
            .orderBy('date', 'desc');
        return Promise.all(rows.map((row) => toExpense(row)));
    },

    async findByUserAndMonth(userId: string, month: string, year: string): Promise<Expense[]> {
        const pattern = `^[0-9]{2}-${month}-${year}`;
        const rows = await db<ExpenseRow>(EXPENSES)
            .where({ user_id: userId })
            .whereRaw('date ~ ?', [pattern])
            .orderBy('date');
        return Promise.all(rows.map((row) => toExpense(row)));
    },

    async findLastExpense(): Promise<Expense | null> {
        const row = await db<ExpenseRow>(EXPENSES).orderBy('created_at', 'desc').first();
        if (!row) return null;
        return toExpense(row);
    },

    async createWithProducts(
        userId: string,
        date: string,
        products: ProductInput[],
    ): Promise<Expense> {
        return db.transaction(async (trx) => {
            const [expenseRow] = await trx<ExpenseRow>(EXPENSES)
                .insert({ user_id: userId, date })
                .returning('*');

            if (!expenseRow) {
                throw new Error('Failed to create expense');
            }

            const productRows = await trx<ExpenseProductRow>(EXPENSE_PRODUCTS)
                .insert(
                    products.map((p) => ({
                        expense_id: expenseRow.id,
                        name: p.name,
                        price: p.price,
                        category: p.category,
                        label: p.label ?? null,
                    })),
                )
                .returning('*');

            return mapExpenseRow(expenseRow, productRows);
        });
    },

    async addProducts(expenseId: string, products: ProductInput[]): Promise<Expense | null> {
        const expenseRow = await db<ExpenseRow>(EXPENSES).where({ id: expenseId }).first();
        if (!expenseRow) return null;

        await db<ExpenseProductRow>(EXPENSE_PRODUCTS).insert(
            products.map((p) => ({
                expense_id: expenseId,
                name: p.name,
                price: p.price,
                category: p.category,
                label: p.label ?? null,
            })),
        );

        return toExpense(expenseRow);
    },

    async findProductById(
        userId: string,
        date: string,
        productId: string,
    ): Promise<{ expense: Expense; product: Product } | null> {
        const expense = await this.findByUserAndDate(userId, date);
        if (!expense) return null;

        const product = expense.products.find((p) => p._id === productId);
        if (!product) return null;

        return { expense, product };
    },

    async updateProduct(
        expenseId: string,
        productId: string,
        fields: { name: string; price: number; category: string; label?: string },
    ): Promise<void> {
        await db(EXPENSE_PRODUCTS)
            .where({ id: productId, expense_id: expenseId })
            .update({
                name: fields.name,
                price: fields.price,
                category: fields.category,
                label: fields.label ?? null,
            });
    },

    async removeProduct(expenseId: string, productId: string): Promise<number> {
        return db(EXPENSE_PRODUCTS).where({ id: productId, expense_id: expenseId }).delete();
    },

    async deleteExpense(expenseId: string): Promise<void> {
        await db(EXPENSES).where({ id: expenseId }).delete();
    },

    async deleteIfEmpty(expenseId: string): Promise<void> {
        const count = await db(EXPENSE_PRODUCTS).where({ expense_id: expenseId }).count('* as count');
        const productCount = Number(count[0]?.count ?? 0);
        if (productCount === 0) {
            await db(EXPENSES).where({ id: expenseId }).delete();
        }
    },

    async moveProductToDate(
        userId: string,
        productId: string,
        fromDate: string,
        toDate: string,
        product: ProductInput,
    ): Promise<void> {
        await db.transaction(async (trx) => {
            const fromExpense = await trx<ExpenseRow>(EXPENSES)
                .where({ user_id: userId, date: fromDate })
                .first();

            if (!fromExpense) return;

            await trx(EXPENSE_PRODUCTS)
                .where({ id: productId, expense_id: fromExpense.id })
                .delete();

            const remaining = await trx(EXPENSE_PRODUCTS)
                .where({ expense_id: fromExpense.id })
                .count('* as count');
            if (Number(remaining[0]?.count ?? 0) === 0) {
                await trx(EXPENSES).where({ id: fromExpense.id }).delete();
            }

            const toExpense = await trx<ExpenseRow>(EXPENSES)
                .where({ user_id: userId, date: toDate })
                .first();

            if (!toExpense) {
                const [newExpense] = await trx<ExpenseRow>(EXPENSES)
                    .insert({ user_id: userId, date: toDate })
                    .returning('*');
                if (!newExpense) return;
                await trx(EXPENSE_PRODUCTS).insert({
                    expense_id: newExpense.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    label: product.label ?? null,
                });
            } else {
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
