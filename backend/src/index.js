import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSessionFromEnv } from './services/session.js';
import { instagramRouter } from './routes/instagram.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/instagram', instagramRouter);
app.use(errorHandler);

await initSessionFromEnv();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
