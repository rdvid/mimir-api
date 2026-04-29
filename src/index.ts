import dotenv from 'dotenv';
import { app } from './app.js';
import connectToDb from './db/conn.js';

dotenv.config({ path: '.env' });

const PORT = process.env.PORT as string;

connectToDb()
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log(`Server Listen at PORT ${PORT}`);
        });

        server.on('error', (error: Error) => {
            console.log('Error on Express App', error);
            throw error;
        });
    })
    .catch((err: unknown) => {
        console.log('Connection Failed!!', err);
        throw err;
    });
