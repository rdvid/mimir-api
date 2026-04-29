import UserModel from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';

import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getTodayDate } from '../utils/getCurrentDate.js';
import ExpenseModel, { type Product } from '../models/expenses.model.js';

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

interface ProductInput {
    name: string;
    price: number;
    category: string;
    label?: string;
}

interface AddTodayExpensesBody {
    productsArray: ProductInput[];
}

interface PastDayExpensesInput {
    date: string;
    productsArray: ProductInput[];
}

interface AddParticularDateExpensesBody {
    pastDaysExpensesArray: PastDayExpensesInput[];
}

interface ShowParticularDateExpensesBody {
    date: string;
}

interface EditUserExpensesBody {
    expenseId: string;
    actualDate: string;
    expenseName: string;
    selectedLabel?: string;
    expensePrice: number;
    expenseCategory: string;
    expenseDate: string;
}

interface DeleteUserExpensesBody {
    expenseId: string;
    expenseDate: string;
    isAddPriceToPocketMoney: boolean;
}

export const addTodayExpenses = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, AddTodayExpensesBody>, res: Response) => {
        const currentDate = getTodayDate();
        const { productsArray } = req.body;
        const userId = req.user._id;
        if (!currentDate || !productsArray || productsArray.length === 0) {
            throw new ApiError(400, 'All Field required!!');
        }

        const totalExpenses = productsArray.reduce(
            (total: number, item: ProductInput) => total + item.price,
            0,
        );
        const firstExpensesOfToday = await ExpenseModel.findOne({
            user: userId,
            date: currentDate,
        });

        let createdExpenses: unknown;
        if (firstExpensesOfToday === null) {
            createdExpenses = await ExpenseModel.create({
                user: userId,
                products: productsArray,
            });
        } else {
            createdExpenses = await ExpenseModel.updateOne(
                { user: userId, date: currentDate },
                {
                    $addToSet: {
                        products: {
                            $each: productsArray,
                        },
                    },
                },
            );
        }

        if (!createdExpenses) {
            throw new ApiError(500, 'Something went wrong!!');
        }

        const user = await UserModel.findOne({ _id: userId });
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        const newBalance = parseFloat(user.currentPocketMoney) - parseFloat(String(totalExpenses));
        user.currentPocketMoney = newBalance.toString();
        await user.save();

        return res.status(201).json(
            new ApiResponse(201, createdExpenses, {
                currentPocketMoney: user.currentPocketMoney,
            }),
        );
    },
);

export const showTodayExpenses = asyncHandler(async (req: Request, res: Response) => {
    const currentDate = getTodayDate();
    const todayExpenses = await ExpenseModel.findOne({
        user: req.user._id,
        date: currentDate,
    });
    const products = todayExpenses?.products || [];
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                products,
                todayExpenses ? 'Today expenses found!!' : 'No expenses found for today',
            ),
        );
});

export const addParticularDateExpenses = asyncHandler(
    async (
        req: Request<ParamsDictionary, unknown, AddParticularDateExpensesBody>,
        res: Response,
    ) => {
        const userId = req.user._id;
        const { pastDaysExpensesArray } = req.body;

        if (!Array.isArray(pastDaysExpensesArray) || pastDaysExpensesArray.length === 0) {
            throw new ApiError(400, 'Must Provide Data!!');
        }

        const totalDaysExpenses = pastDaysExpensesArray.length;
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        let currentPocketMoney = parseFloat(user.currentPocketMoney);
        let totalExpenses = 0;

        for (const expenses of pastDaysExpensesArray) {
            const { date, productsArray } = expenses;

            if (Array.isArray(productsArray) && productsArray.length > 0) {
                totalExpenses = productsArray.reduce(
                    (total: number, item: ProductInput) => total + item.price,
                    0,
                );

                const firstExpensesOfDate = await ExpenseModel.findOne({
                    user: userId,
                    date,
                });

                let createdExpenses: unknown;
                if (!firstExpensesOfDate) {
                    createdExpenses = await ExpenseModel.create({
                        user: userId,
                        date,
                        products: productsArray,
                    });
                } else {
                    createdExpenses = await ExpenseModel.updateOne(
                        { user: userId, date },
                        { $addToSet: { products: { $each: productsArray } } },
                    );
                }

                if (!createdExpenses) {
                    throw new ApiError(500, 'Something went wrong with expense creation!');
                }
                currentPocketMoney -= totalExpenses;
            }
        }

        user.currentPocketMoney = currentPocketMoney.toString();
        await user.save();

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    null,
                    `${totalDaysExpenses} Days Expenses created successfully!!`,
                ),
            );
    },
);

export const showParticularDateExpenses = asyncHandler(
    async (
        req: Request<ParamsDictionary, unknown, ShowParticularDateExpensesBody>,
        res: Response,
    ) => {
        const { date } = req.body;
        const userId = req.user._id;
        if (!date) {
            throw new ApiError(400, 'Date is required!!');
        }
        const particularDateExpenses = await ExpenseModel.findOne({
            user: userId,
            date,
        });
        if (!particularDateExpenses) {
            return res.status(200).json(new ApiResponse(200, null, 'No Expenses Found !!'));
        }
        return res
            .status(200)
            .json(new ApiResponse(200, particularDateExpenses, 'Expenses Found successfully!!'));
    },
);

export const showAllDateExpenses = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const allDateExpenses = await ExpenseModel.find({ user: userId }).sort({
        date: -1,
    });
    if (!allDateExpenses) {
        throw new ApiError(404, 'No expenses found!!');
    }
    return res
        .status(200)
        .json(new ApiResponse(200, allDateExpenses, 'All Expenses Found successfully!!'));
});

export const editUserExpenses = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, EditUserExpensesBody>, res: Response) => {
        const userId = req.user._id;
        const {
            expenseId,
            actualDate,
            expenseName,
            selectedLabel,
            expensePrice,
            expenseCategory,
            expenseDate,
        } = req.body;

        if (
            !expenseName ||
            !expenseCategory ||
            !expenseDate ||
            typeof expensePrice !== 'number' ||
            !/^\d{2}-\d{2}-\d{4}$/.test(String(actualDate))
        ) {
            throw new ApiError(400, 'Invalid input values.');
        }

        const existExpenses = await ExpenseModel.findOne({
            user: userId,
            date: actualDate,
        });

        if (!existExpenses) {
            throw new ApiError(500, 'Something went wrong!!');
        }

        const expensesFound = existExpenses?.products?.find(
            (prod: Product & { _id?: { toString(): string } }) =>
                prod._id?.toString() === expenseId,
        );
        const actualExpensePrice = expensesFound?.price;

        if (typeof actualExpensePrice !== 'number' || Number.isNaN(actualExpensePrice)) {
            throw new ApiError(500, 'Previous expense price is invalid.');
        }

        if (actualDate === expenseDate && expensesFound) {
            expensesFound.name = expenseName;
            expensesFound.price = expensePrice;
            expensesFound.category = expenseCategory;
            expensesFound.label = selectedLabel;
            await existExpenses.save();
        } else {
            const existingExpenseCollection = await ExpenseModel.findOneAndUpdate(
                { user: userId, date: actualDate },
                { $pull: { products: { _id: expenseId } } },
                { new: true },
            );

            if (existingExpenseCollection && existingExpenseCollection.products.length === 0) {
                await ExpenseModel.findOneAndDelete({ user: userId, date: actualDate });
            }

            const expenseNewDateExist = await ExpenseModel.findOne({
                user: userId,
                date: expenseDate,
            });

            const productObject = {
                name: expenseName,
                price: expensePrice,
                category: expenseCategory,
                label: selectedLabel,
            };

            if (!expenseNewDateExist) {
                await ExpenseModel.create({
                    user: userId,
                    products: [productObject],
                    date: expenseDate,
                });
            } else {
                await ExpenseModel.findOneAndUpdate(
                    { user: userId, date: expenseDate },
                    { $addToSet: { products: productObject } },
                    { new: true },
                );
            }
        }

        const user = req.user;
        const priceDifferences =
            parseFloat(String(actualExpensePrice)) - parseFloat(String(expensePrice));
        if (Number.isNaN(priceDifferences)) {
            throw new ApiError(500, 'Price difference calculation failed.');
        }

        const currentMoney = parseFloat(user.currentPocketMoney);
        if (Number.isNaN(currentMoney)) {
            throw new ApiError(500, "User's current pocket money is invalid.");
        }

        const newBalance = currentMoney + priceDifferences;
        if (Number.isNaN(newBalance)) {
            throw new ApiError(500, 'New balance calculation failed.');
        }

        user.currentPocketMoney = newBalance.toFixed(2);
        await user.save();
        return res.status(201).json(new ApiResponse(201, null, 'Expenses updated successfully!'));
    },
);

export const deleteUserExpenses = asyncHandler(
    async (req: Request<ParamsDictionary, unknown, DeleteUserExpensesBody>, res: Response) => {
        const userId = req.user._id;
        const { expenseId, expenseDate, isAddPriceToPocketMoney } = req.body;

        if (!expenseDate || !/^\d{2}-\d{2}-\d{4}$/.test(expenseDate)) {
            throw new ApiError(400, 'Invalid expense date format. Expected DD-MM-YYYY.');
        }

        const existingExpense = await ExpenseModel.findOne(
            { user: userId, date: expenseDate, 'products._id': expenseId },
            { 'products.$': 1 },
        );

        const foundProduct = existingExpense?.products?.[0];
        if (!foundProduct) {
            throw new ApiError(404, 'Expense not found.');
        }

        const expensePrice = foundProduct.price;

        const updatedExpense = await ExpenseModel.findOneAndUpdate(
            { user: userId, date: expenseDate },
            { $pull: { products: { _id: expenseId } } },
            { new: true },
        );

        if (updatedExpense && updatedExpense.products.length === 0) {
            await ExpenseModel.deleteOne({ _id: updatedExpense._id });
        }

        if (isAddPriceToPocketMoney) {
            const user = req.user;
            const newBalance =
                parseFloat(user.currentPocketMoney) + parseFloat(String(expensePrice || 0));
            user.currentPocketMoney = newBalance.toString();
            await user.save();
        }

        return res.status(201).json(new ApiResponse(201, null, 'Expense deleted successfully!'));
    },
);
