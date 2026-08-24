import { userRepository } from '../repositories/user.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getTodayDate } from '../utils/getCurrentDate.js';
export const addTodayExpenses = asyncHandler(async (req, res) => {
    const currentDate = getTodayDate();
    const { productsArray } = req.body;
    const userId = req.user._id;
    if (!currentDate || !productsArray || productsArray.length === 0) {
        throw new ApiError(400, 'All Field required!!');
    }
    const totalExpenses = productsArray.reduce((total, item) => total + item.price, 0);
    const firstExpensesOfToday = await expenseRepository.findByUserAndDate(userId, currentDate);
    let createdExpenses;
    if (firstExpensesOfToday === null) {
        createdExpenses = await expenseRepository.createWithProducts(userId, currentDate, productsArray);
    }
    else {
        createdExpenses = await expenseRepository.addProducts(firstExpensesOfToday._id, productsArray);
    }
    if (!createdExpenses) {
        throw new ApiError(500, 'Something went wrong!!');
    }
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    const newBalance = parseFloat(user.currentPocketMoney) - parseFloat(String(totalExpenses));
    await userRepository.updateCurrentPocketMoney(userId, newBalance.toString());
    return res.status(201).json(new ApiResponse(201, createdExpenses, {
        currentPocketMoney: newBalance.toString(),
    }));
});
export const showTodayExpenses = asyncHandler(async (req, res) => {
    const currentDate = getTodayDate();
    const todayExpenses = await expenseRepository.findByUserAndDate(req.user._id, currentDate);
    const products = todayExpenses?.products || [];
    return res
        .status(200)
        .json(new ApiResponse(200, products, todayExpenses ? 'Today expenses found!!' : 'No expenses found for today'));
});
export const addParticularDateExpenses = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { pastDaysExpensesArray } = req.body;
    if (!Array.isArray(pastDaysExpensesArray) || pastDaysExpensesArray.length === 0) {
        throw new ApiError(400, 'Must Provide Data!!');
    }
    const totalDaysExpenses = pastDaysExpensesArray.length;
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    let currentPocketMoney = parseFloat(user.currentPocketMoney);
    let totalExpenses = 0;
    for (const expenses of pastDaysExpensesArray) {
        const { date, productsArray } = expenses;
        if (Array.isArray(productsArray) && productsArray.length > 0) {
            totalExpenses = productsArray.reduce((total, item) => total + item.price, 0);
            const firstExpensesOfDate = await expenseRepository.findByUserAndDate(userId, date);
            let createdExpenses;
            if (!firstExpensesOfDate) {
                createdExpenses = await expenseRepository.createWithProducts(userId, date, productsArray);
            }
            else {
                createdExpenses = await expenseRepository.addProducts(firstExpensesOfDate._id, productsArray);
            }
            if (!createdExpenses) {
                throw new ApiError(500, 'Something went wrong with expense creation!');
            }
            currentPocketMoney -= totalExpenses;
        }
    }
    await userRepository.updateCurrentPocketMoney(userId, currentPocketMoney.toString());
    return res
        .status(201)
        .json(new ApiResponse(201, null, `${totalDaysExpenses} Days Expenses created successfully!!`));
});
export const showParticularDateExpenses = asyncHandler(async (req, res) => {
    const { date } = req.body;
    const userId = req.user._id;
    if (!date) {
        throw new ApiError(400, 'Date is required!!');
    }
    const particularDateExpenses = await expenseRepository.findByUserAndDate(userId, date);
    if (!particularDateExpenses) {
        return res.status(200).json(new ApiResponse(200, null, 'No Expenses Found !!'));
    }
    return res
        .status(200)
        .json(new ApiResponse(200, particularDateExpenses, 'Expenses Found successfully!!'));
});
export const showAllDateExpenses = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const allDateExpenses = await expenseRepository.findByUserId(userId);
    if (!allDateExpenses || allDateExpenses.length === 0) {
        throw new ApiError(404, 'No expenses found!!');
    }
    return res
        .status(200)
        .json(new ApiResponse(200, allDateExpenses, 'All Expenses Found successfully!!'));
});
export const editUserExpenses = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { expenseId, actualDate, expenseName, selectedLabel, expensePrice, expenseCategory, expenseDate, } = req.body;
    if (!expenseName ||
        !expenseCategory ||
        !expenseDate ||
        typeof expensePrice !== 'number' ||
        !/^\d{2}-\d{2}-\d{4}$/.test(String(actualDate))) {
        throw new ApiError(400, 'Invalid input values.');
    }
    const existExpenses = await expenseRepository.findByUserAndDate(userId, actualDate);
    if (!existExpenses) {
        throw new ApiError(500, 'Something went wrong!!');
    }
    const expensesFound = existExpenses.products.find((prod) => prod._id === expenseId);
    const actualExpensePrice = expensesFound?.price;
    if (typeof actualExpensePrice !== 'number' || Number.isNaN(actualExpensePrice)) {
        throw new ApiError(500, 'Previous expense price is invalid.');
    }
    if (actualDate === expenseDate && expensesFound) {
        await expenseRepository.updateProduct(existExpenses._id, expenseId, {
            name: expenseName,
            price: expensePrice,
            category: expenseCategory,
            label: selectedLabel,
        });
    }
    else {
        await expenseRepository.moveProductToDate(userId, expenseId, actualDate, expenseDate, {
            name: expenseName,
            price: expensePrice,
            category: expenseCategory,
            label: selectedLabel,
        });
    }
    const user = req.user;
    const priceDifferences = parseFloat(String(actualExpensePrice)) - parseFloat(String(expensePrice));
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
    await userRepository.updateCurrentPocketMoney(userId, newBalance.toFixed(2));
    return res.status(201).json(new ApiResponse(201, null, 'Expenses updated successfully!'));
});
export const deleteUserExpenses = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { expenseId, expenseDate, isAddPriceToPocketMoney } = req.body;
    if (!expenseDate || !/^\d{2}-\d{2}-\d{4}$/.test(expenseDate)) {
        throw new ApiError(400, 'Invalid expense date format. Expected DD-MM-YYYY.');
    }
    const result = await expenseRepository.findProductById(userId, expenseDate, expenseId);
    if (!result) {
        throw new ApiError(404, 'Expense not found.');
    }
    const expensePrice = result.product.price;
    await expenseRepository.removeProduct(result.expense._id, expenseId);
    await expenseRepository.deleteIfEmpty(result.expense._id);
    if (isAddPriceToPocketMoney) {
        const user = req.user;
        const newBalance = parseFloat(user.currentPocketMoney) + parseFloat(String(expensePrice || 0));
        await userRepository.updateCurrentPocketMoney(userId, newBalance.toString());
    }
    return res.status(201).json(new ApiResponse(201, null, 'Expense deleted successfully!'));
});
