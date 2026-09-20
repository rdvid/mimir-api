import dotenv from 'dotenv';
import { connectToDb, disconnectDb } from './knex.js';
import { seedDemoData } from './seed-demo.js';

dotenv.config({ path: '.env' });

await connectToDb();
await seedDemoData();
await disconnectDb();
