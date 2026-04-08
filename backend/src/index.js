import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSessionFromEnv } from './services/session.js';
import { instagramRouter } from './routes/instagram.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));

app.use('/api/instagram', instagramRouter);
app.use(errorHandler);

await initSessionFromEnv();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
