import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { categoryRepository } from '../repositories/category.repository.js';
export const listCategories = asyncHandler(async (req, res) => {
    const categories = await categoryRepository.findByUserId(req.user.id);
    res.status(200).json(new ApiResponse(200, categories, 'Categories retrieved'));
});
export const createCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        throw new ApiError(400, 'name is required');
    }
    try {
        const category = await categoryRepository.create({
            userId: req.user.id,
            name: name.trim(),
        });
        res.status(201).json(new ApiResponse(201, category, 'Category created'));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('unique') || message.includes('duplicate')) {
            throw new ApiError(409, 'Category already exists');
        }
        throw error;
    }
});
