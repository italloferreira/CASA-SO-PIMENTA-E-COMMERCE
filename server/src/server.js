import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import kitRoutes from './routes/kitRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { getMpPublicKey } from './controllers/paymentController.js';

import { createTables } from './database/schema.js';
import { seedDatabase } from './database/seed.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3333;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5500')
  .split(',')
  .map(function (o) { return o.trim(); })
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.indexOf(origin) !== -1) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS.'));
    }
  },
  credentials: true
}));

app.use(cookieParser());

app.use(morgan('short'));

app.use(express.json({ limit: '1mb' }));

app.use('/api/categories', categoryRoutes);

app.use('/api/products', productRoutes);

app.use('/api/uploads', uploadRoutes);

app.use('/api/banners', bannerRoutes);

app.use('/api/kits', kitRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);

app.use('/api/settings', settingsRoutes);

app.get('/api/config/mp-key', getMpPublicKey);

app.get('/', (req, res) => {
  res.json({
    message: 'API Casa Só Pimenta rodando!'
  });
});

app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      message: 'Erro interno do servidor.'
    });
  } else {
    res.status(err.status || 500).json({
      message: err.message || 'Erro interno do servidor.'
    });
  }
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('ERRO: JWT_SECRET não definida no .env. O servidor não pode iniciar com chave vazia.');
    process.exit(1);
  }

  if (!process.env.SUPABASE_DB_URL) {
    console.error('ERRO: SUPABASE_DB_URL não definida no .env.');
    process.exit(1);
  }

  try {
    await createTables();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err);
    process.exit(1);
  }
}

start();
