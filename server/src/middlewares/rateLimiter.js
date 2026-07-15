import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const shippingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { message: 'Muitas requisições de frete. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas tentativas de pagamento. Aguarde 5 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});
