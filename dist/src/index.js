import dotenv from 'dotenv';
import { app } from './app.js';
import { connectToDb } from './db/knex.js';
dotenv.config({ path: '.env' });
const PORT = process.env.PORT;
connectToDb()
    .then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server Listen at PORT ${PORT}`);
    });
    server.on('error', (error) => {
        console.log('Error on Express App', error);
        throw error;
    });
})
    .catch((err) => {
    console.log('Connection Failed!!', err);
    throw err;
});
