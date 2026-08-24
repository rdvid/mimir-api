import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { api_key, api_secret, cloud_name } from './constants.js';
cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
});
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log('No file path provided');
            return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });
        return response;
    }
    catch (error) {
        console.log('error of cloudinary', error);
        if (localFilePath) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};
export { uploadOnCloudinary };
