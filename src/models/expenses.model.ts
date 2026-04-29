import mongoose, { HydratedDocument, Schema } from 'mongoose';

export interface Product {
    _id?: mongoose.Types.ObjectId;
    name: string;
    price: number;
    category: string;
    label?: string;
}

export interface Expense {
    _id: mongoose.Types.ObjectId;
    user: Schema.Types.ObjectId;
    date: string;
    products: Product[];
}

export type ExpenseDocument = HydratedDocument<Expense>;

const ProductSchema = new Schema<Product>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: false,
        },
    },
    { timestamps: true },
);

const ExpensesSchema = new Schema<Expense>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        date: {
            type: String,
            required: true,
            default: () => {
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                return `${day}-${month}-${year}`;
            },
        },
        products: {
            type: [ProductSchema],
            validate: [arrayLimit, 'Must have at least 1 product'],
        },
    },
    {
        timestamps: true,
    },
);

function arrayLimit(val: Product[]): boolean {
    return val.length > 0;
}

const ExpenseModel = mongoose.model('Expense', ExpensesSchema);
export default ExpenseModel;
