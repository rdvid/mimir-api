export const mapPocketMoneyRow = (row) => ({
    _id: row.id,
    date: row.date,
    amount: row.amount,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapLentMoneyRow = (row) => ({
    _id: row.id,
    personName: row.person_name,
    price: row.price,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapSessionRow = (row) => ({
    _id: row.id,
    token: row.token,
    ip: row.ip,
    userAgent: row.user_agent,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapUserRow = (row, pocketMoney = [], lentMoney = [], sessions = [], includePassword = false) => {
    const user = {
        _id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        avatar: row.avatar,
        dateOfBirth: row.date_of_birth,
        profession: row.profession,
        instagramLink: row.instagram_link,
        facebookLink: row.facebook_link,
        PocketMoneyHistory: pocketMoney.map(mapPocketMoneyRow),
        LentMoneyHistory: lentMoney.map(mapLentMoneyRow),
        currentPocketMoney: row.current_pocket_money,
        googleId: row.google_id,
        authProvider: row.auth_provider,
        activeSessions: sessions.map(mapSessionRow),
        isVerified: row.is_verified,
        lastLogin: row.last_login,
        currentLogin: row.current_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
    if (includePassword && row.password) {
        user.password = row.password;
    }
    return user;
};
export const mapProductRow = (row) => ({
    _id: row.id,
    name: row.name,
    price: row.price,
    category: row.category,
    label: row.label ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const mapExpenseRow = (row, products = []) => ({
    _id: row.id,
    user: row.user_id,
    date: row.date,
    products: products.map(mapProductRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
