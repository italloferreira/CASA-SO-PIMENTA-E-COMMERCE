import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { createTables } from './database/schema.js';

dotenv.config();

createTables();

const app = express();

const PORT = process.env.PORT || 3333;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));

app.use(express.json());

app.use('/uploads', express.static(path.resolve('src', 'uploads')));

app.get('/', (req, res) => {
  res.json({
    message: 'API Casa Só Pimenta rodando!'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});