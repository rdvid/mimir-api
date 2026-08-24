export interface Product {
    _id: string;
    name: string;
    price: number;
    category: string;
    label?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Expense {
    _id: string;
    user: string;
    date: string;
    products: Product[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ExpenseRow {
    id: string;
    user_id: string;
    date: string;
    created_at: Date;
    updated_at: Date;
}

export interface ExpenseProductRow {
    id: string;
    expense_id: string;
    name: string;
    price: number;
    category: string;
    label: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface ProductInput {
    name: string;
    price: number;
    category: string;
    label?: string;
}
