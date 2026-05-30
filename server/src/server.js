import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import kitRoutes from './routes/kitRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

import { createTables } from './database/schema.js';
import { seedDatabase } from './database/seed.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('ERRO: JWT_SECRET não definida no .env. O servidor não pode iniciar com chave vazia.');
  process.exit(1);
}

createTables();
seedDatabase();

const app = express();

const PORT = process.env.PORT || 3333;

app.use(cors());

app.use(express.json());

app.use('/uploads', express.static(path.resolve('src', 'uploads')));

app.use('/api/categories', categoryRoutes);

app.use('/api/products', productRoutes);

app.use('/api/uploads', uploadRoutes);

app.use('/api/banners', bannerRoutes);

app.use('/api/kits', kitRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'API Casa Só Pimenta rodando!'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
