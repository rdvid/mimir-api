import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { transactionRepository } from '../repositories/transaction.repository.js';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const parseType = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (value === 'expense' || value === 'income')
        return value;
    throw new ApiError(400, 'type must be expense or income');
};
const parseOptionalDate = (value, field) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    if (typeof value !== 'string' || !ISO_DATE.test(value)) {
        throw new ApiError(400, `${field} must be YYYY-MM-DD`);
    }
    return value;
};
const parsePeriodFilters = (query) => ({
    from: parseOptionalDate(query.from, 'from'),
    to: parseOptionalDate(query.to, 'to'),
    type: parseType(query.type),
    categoryId: typeof query.categoryId === 'string' ? query.categoryId : undefined,
});
export const getSummary = asyncHandler(async (req, res) => {
    const filters = parsePeriodFilters(req.query);
    const summary = await transactionRepository.getPeriodSummary(req.user.id, filters);
    res.status(200).json(new ApiResponse(200, summary, 'Summary retrieved'));
});
export const getCategorySummary = asyncHandler(async (req, res) => {
    const filters = parsePeriodFilters(req.query);
    const summary = await transactionRepository.getCategorySummary(req.user.id, filters);
    res.status(200).json(new ApiResponse(200, summary, 'Category summary retrieved'));
});
export const getMonthlySummary = asyncHandler(async (req, res) => {
    const yearRaw = req.query.year;
    const year = typeof yearRaw === 'string' ? Number(yearRaw) : NaN;
    if (!Number.isInteger(year) || year < 1970 || year > 2100) {
        throw new ApiError(400, 'year is required and must be a valid year');
    }
    const type = parseType(req.query.type);
    const summary = await transactionRepository.getMonthlySummary(req.user.id, year, type);
    res.status(200).json(new ApiResponse(200, summary, 'Monthly summary retrieved'));
});
