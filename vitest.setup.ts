import dotenv from 'dotenv';
import path from 'path';

// Load .env.local before anything else
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
