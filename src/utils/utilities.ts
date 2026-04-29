import UserModel from '../models/user.model.js';

export const generateUniqueUsername = async (name: string): Promise<string> => {
    const baseUsername = name.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let count = 1;

    while (await UserModel.findOne({ username })) {
        username = `${baseUsername}${count}`;
        count += 1;
    }

    return username;
};
