import { userRepository } from '../repositories/user.repository.js';
export const generateUniqueUsername = async (name) => {
    const baseUsername = name.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let count = 1;
    while (await userRepository.existsByUsername(username)) {
        username = `${baseUsername}${count}`;
        count += 1;
    }
    return username;
};
