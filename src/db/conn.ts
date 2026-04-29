import mongoose from 'mongoose';

const connectToDb = async (): Promise<void> => {
    try {
        const mongoUrl = process.env.MONGO_URL;
        if (!mongoUrl) {
            throw new Error('MONGO_URL is not configured');
        }

        const connectionInstance = await mongoose.connect(mongoUrl);
        console.info(`Mongodb Connected!! HOST : ${connectionInstance.connection.host}`);
    } catch (error: unknown) {
        console.error('MongoDB Connection Failed!', error);
        process.exit(1);
    }
};

export default connectToDb;
