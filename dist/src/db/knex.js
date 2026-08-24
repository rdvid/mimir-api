import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connection = process.env.DATABASE_URL;
if (!connection) {
    throw new Error('DATABASE_URL is not configured');
}
const db = knex({
    client: 'pg',
    connection,
    pool: { min: 2, max: 10 },
    migrations: {
        directory: path.join(__dirname, 'migrations'),
        extension: 'js',
    },
});
export default db;
export const connectToDb = async () => {
    try {
        await db.raw('SELECT 1');
        await db.migrate.latest();
        console.info('PostgreSQL connected and migrations applied');
    }
    catch (error) {
        console.error('PostgreSQL connection failed!', error);
        process.exit(1);
    }
};
export const disconnectDb = async () => {
    await db.destroy();
};
