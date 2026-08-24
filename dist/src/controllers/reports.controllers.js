import { expenseRepository } from '../repositories/expense.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
export const TotalExpensesAndAddedMoneyOfMonth = asyncHandler(async (req, res) => {
    const user = req.user;
    const userId = req.user._id;
    const { month, year } = req.body;
    if (typeof month !== 'string' || typeof year !== 'string') {
        throw new ApiError(500, 'Month and year should be string!!');
    }
    const monthExpenses = await expenseRepository.findByUserAndMonth(userId, month, year);
    let GroceriesExpenses = 0;
    let Housing_UtilitiesExpenses = 0;
    let MedicalExpenses = 0;
    let FoodExpenses = 0;
    let PersonalExpenses = 0;
    let EducationalExpenses = 0;
    let TransportationExpenses = 0;
    let MiscellaneousExpenses = 0;
    const totalExpenses = monthExpenses.reduce((accumulator, currentExpense) => {
        const productTotal = currentExpense.products.reduce((innerAccu, product) => {
            if (product.category === 'Groceries') {
                GroceriesExpenses += product.price;
            }
            else if (product.category === 'Housing & Utilities') {
                Housing_UtilitiesExpenses += product.price;
            }
            else if (product.category === 'Medical') {
                MedicalExpenses += product.price;
            }
            else if (product.category === 'Food') {
                FoodExpenses += product.price;
            }
            else if (product.category === 'Personal') {
                PersonalExpenses += product.price;
            }
            else if (product.category === 'Educational') {
                EducationalExpenses += product.price;
            }
            else if (product.category === 'Transportation') {
                TransportationExpenses += product.price;
            }
            else if (product.category === 'Miscellaneous') {
                MiscellaneousExpenses += product.price;
            }
            return innerAccu + product.price;
        }, 0);
        return accumulator + productTotal;
    }, 0);
    const categoryWiseExpensesData = {
        GroceriesExpenses,
        Housing_UtilitiesExpenses,
        MedicalExpenses,
        FoodExpenses,
        PersonalExpenses,
        EducationalExpenses,
        TransportationExpenses,
        MiscellaneousExpenses,
    };
    const pocketMoneyHistoryArray = user.PocketMoneyHistory;
    const totalAddedMoney = pocketMoneyHistoryArray.reduce((accumulator, currentArray) => {
        return (accumulator +
            parseInt(currentArray.date.split('-')[1] === month ? currentArray.amount : '0'));
    }, 0);
    const lastExpense = await expenseRepository.findLastExpense();
    let lastTotalExpenses = 0;
    if (lastExpense) {
        lastTotalExpenses = lastExpense.products.reduce((accumulator, product) => accumulator + Number(product.price), 0);
    }
    const lentMoneyHistoryArray = user.LentMoneyHistory;
    const totalLentMoney = lentMoneyHistoryArray.reduce((accumulator, currentArray) => {
        return (accumulator +
            parseInt(currentArray.date.split('-')[1] === month ? currentArray.price : '0'));
    }, 0);
    return res.json(new ApiResponse(200, {
        totalExpenses,
        totalAddedMoney,
        totalLentMoney,
        lastTotalExpenses,
        categoryWiseExpensesData,
    }, 'Successfully Calculated Expenses!!'));
});
export const TotalAddedMoneyInMonth = asyncHandler(async (req, res) => {
    const user = req.user;
    const { month } = req.body;
    if (typeof month !== 'string') {
        throw new ApiError(500, 'Month should be string!!');
    }
    const pocketMoneyHistoryArray = user.PocketMoneyHistory;
    const totalAddedMoney = pocketMoneyHistoryArray.reduce((accumulator, currentArray) => {
        return accumulator + parseInt(currentArray.amount);
    }, 0);
    if (!totalAddedMoney) {
        throw new ApiError(500, 'Error during getting totel money!!');
    }
    return res.json(new ApiResponse(200, { totalMoney: totalAddedMoney }, 'Successfully Calculated Expenses!!'));
});
