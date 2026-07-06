import { MercadoPagoConfig, Payment, WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import { pool } from '../database/connection.js';
import crypto from 'crypto';

function getAccessToken() {
  return process.env.NODE_ENV === 'production'
    ? process.env.MP_ACCESS_TOKEN
    : process.env.MP_ACCESS_TOKEN_TEST;
}

export function getPublicKey() {
  return process.env.NODE_ENV === 'production'
    ? process.env.MP_PUBLIC_KEY
    : process.env.MP_PUBLIC_KEY_TEST;
}

function getMpClient() {
  const token = getAccessToken();
  return new MercadoPagoConfig({ accessToken: token });
}

function getPaymentInstance() {
  return new Payment(getMpClient());
}

const MP_API = 'https://api.mercadopago.com/v1';

async function createOrder(body) {
  const res = await fetch(`${MP_API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAccessToken()}`,
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('MP API error:', JSON.stringify(data, null, 2));
    console.error('Request body:', JSON.stringify(body, null, 2));
    const msg = data.errors?.[0]?.message || data.message || 'Erro na API do Mercado Pago';
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function getCardType(paymentMethodId) {
  const debitCards = ['debelo'];
  return debitCards.includes(paymentMethodId) ? 'debit_card' : 'credit_card';
}

export async function processCard(req, res) {
  const { orderId, token, installments, paymentMethodId, email, cpf, amount } = req.body;

  if (!orderId || !token || !installments || !email || !cpf || !amount) {
    return res.status(400).json({ message: 'Dados incompletos para pagamento com cartão.' });
  }

  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const payment = getPaymentInstance();
    const result = await payment.create({
      body: {
        transaction_amount: Number(amount),
        token,
        installments: parseInt(installments),
        payment_method_id: paymentMethodId || undefined,
        payer: {
          email,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, '')
          }
        },
        external_reference: String(orderId)
      }
    });

    const mpPaymentStatus = result.status;
    const mpStatusDetail = result.status_detail;

    let paymentStatus = 'pending';
    let orderStatus = order.status;

    if (mpPaymentStatus === 'approved' || mpPaymentStatus === 'processed') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    } else if (mpPaymentStatus === 'rejected') {
      paymentStatus = 'rejected';
    }

    const mpPaymentId = result.id ? String(result.id) : null;

    await pool.query(`
      UPDATE orders
      SET payment_status = $1, status = $2, payment_external_id = $3,
          payment_method = 'cartao', cpf = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [paymentStatus, orderStatus, mpPaymentId, cpf.replace(/\D/g, ''), orderId]);

    res.json({
      success: paymentStatus === 'paid',
      status: mpPaymentStatus,
      paymentId: mpPaymentId,
      statusDetail: mpStatusDetail
    });
  } catch (err) {
    console.error('Erro processCard:', err);
    const data = err.cause?.[0] || err.data || {};
    const message = data.description || data.message || err.message || 'Erro ao processar pagamento com cartão.';
    res.status(err.status || 500).json({ message });
  }
}

export async function processPix(req, res) {
  const { orderId, email, cpf, amount } = req.body;

  if (!orderId || !email || !cpf || !amount) {
    return res.status(400).json({ message: 'Dados incompletos para pagamento PIX.' });
  }

  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const result = await createOrder({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: String(Number(amount).toFixed(2)),
      external_reference: String(orderId),
      payer: { email },
      transactions: {
        payments: [{
          amount: String(Number(amount).toFixed(2)),
          payment_method: {
            id: 'pix',
            type: 'bank_transfer'
          }
        }]
      }
    });

    const payment = result.transactions?.payments?.[0];
    const pmData = payment?.payment_method || {};
    const qrCode = pmData.qr_code || null;
    const qrCodeBase64 = pmData.qr_code_base64 || null;
    const ticketUrl = pmData.ticket_url || null;
    const mpPaymentId = payment?.id ? String(payment.id) : null;
    const mpOrderId = result.id || null;

    await pool.query(`
      UPDATE orders
      SET payment_status = 'pending', payment_external_id = $1,
          payment_method = 'pix', cpf = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [mpOrderId, cpf.replace(/\D/g, ''), orderId]);

    res.json({
      success: true,
      paymentId: mpOrderId,
      paymentTransactionId: mpPaymentId,
      qrCode,
      qrCodeBase64,
      ticketUrl
    });
  } catch (err) {
    console.error('Erro processPix:', err);
    const data = err.data;
    const message = data?.errors?.[0]?.message || data?.message || err.message || 'Erro ao gerar cobrança PIX.';
    res.status(err.status || 500).json({ message });
  }
}

export async function handleWebhook(req, res) {
  try {
    if (process.env.MP_WEBHOOK_SECRET) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
          dataId: req.query['data.id'],
          secret: process.env.MP_WEBHOOK_SECRET
        });
      } catch (err) {
        if (err instanceof InvalidWebhookSignatureError) {
          console.error('Webhook: assinatura inválida');
          return res.status(401).json({ error: 'Assinatura inválida' });
        }
        throw err;
      }
    } else {
      console.warn('Webhook: MP_WEBHOOK_SECRET não configurado, validação ignorada');
    }

    const body = req.body;
    const type = body.type || req.query.type;
    const data = body.data || { id: req.query['data.id'] };

    let orderId = null;
    let mpPaymentStatus = null;
    let mpStatusDetail = null;
    let mpOrderStatus = null;
    let mpPaymentId = null;

    if (type === 'payment' && data?.id) {
      const payment = getPaymentInstance();
      const result = await payment.get({ id: data.id });

      mpPaymentId = String(result.id);
      orderId = result.external_reference;
      mpPaymentStatus = result.status;
      mpStatusDetail = result.status_detail;

    } else if (type === 'order' && data?.id) {
      const res = await fetch(`${MP_API}/orders/${data.id}`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const result = await res.json();

      mpOrderStatus = result.status;
      orderId = result.external_reference;
      const payment = result.transactions?.payments?.[0];
      if (payment) {
        mpPaymentId = String(payment.id);
        mpPaymentStatus = payment.status;
        mpStatusDetail = payment.status_detail;
      }
    }

    if (!orderId) {
      return res.status(200).json({ received: true });
    }

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    const finalStatus = mpPaymentStatus || mpOrderStatus;

    if (finalStatus === 'processed' || finalStatus === 'approved') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    } else if (finalStatus === 'rejected') {
      paymentStatus = 'rejected';
    } else if (finalStatus === 'refunded') {
      paymentStatus = 'refunded';
      orderStatus = 'cancelled';
    } else if (finalStatus === 'charged_back') {
      paymentStatus = 'chargeback';
    } else if (finalStatus === 'cancelled' || finalStatus === 'expired') {
      paymentStatus = 'cancelled';
      orderStatus = 'cancelled';
    } else if (finalStatus === 'action_required' && mpStatusDetail === 'waiting_transfer') {
      paymentStatus = 'pending';
    }

    const externalId = mpPaymentId || data?.id || null;

    await pool.query(`
      UPDATE orders
      SET payment_status = $1, status = $2, payment_external_id = COALESCE($3, payment_external_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND (payment_status IS DISTINCT FROM $1 OR status IS DISTINCT FROM $2)
    `, [paymentStatus, orderStatus, externalId, orderId]);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro handleWebhook:', err);
    res.status(200).json({ received: true });
  }
}

export async function getPaymentStatus(req, res) {
  const { paymentId } = req.params;

  if (!paymentId) {
    return res.status(400).json({ message: 'paymentId é obrigatório.' });
  }

  try {
    const payRes = await fetch(`${MP_API}/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });
    if (payRes.ok) {
      const result = await payRes.json();
      return res.json({
        status: result.status,
        statusDetail: result.status_detail,
        amount: result.transaction_amount
      });
    }

    const ordRes = await fetch(`${MP_API}/orders/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });
    if (ordRes.ok) {
      const result = await ordRes.json();
      const payment = result.transactions?.payments?.[0];
      return res.json({
        status: payment?.status || result.status,
        statusDetail: payment?.status_detail,
        amount: result.total_amount
      });
    }

    res.status(404).json({ message: 'Pagamento não encontrado no Mercado Pago.' });
  } catch (err) {
    console.error('Erro getPaymentStatus:', err);
    res.status(500).json({ message: 'Erro ao consultar status do pagamento.' });
  }
}

export async function getMpPublicKey(req, res) {
  res.json({ publicKey: getPublicKey() });
}
