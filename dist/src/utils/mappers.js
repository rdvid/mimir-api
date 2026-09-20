const toNumber = (value) => Number(value);
const toDateString = (value) => {
    if (typeof value === 'string') {
        return value.slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
};
export const mapUserRow = (row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapCategoryRow = (row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapTransactionRow = (row) => ({
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    type: row.type,
    amount: toNumber(row.amount),
    date: toDateString(row.date),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
