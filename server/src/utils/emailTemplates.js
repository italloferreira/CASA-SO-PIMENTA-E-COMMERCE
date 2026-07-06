// =============================================
//  TEMPLATES DE EMAIL — Casa Só Pimenta
//  Edite à vontade: cores, textos, logo, links
// =============================================

const STORE_NAME = 'Casa Só Pimenta';
const STORE_URL = process.env.FRONTEND_URL || 'http://localhost:5500/site/pages/index.html';
const PRIMARY_COLOR = '#c53b22';
const SECONDARY_COLOR = '#1a1a1a';
const BG_COLOR = '#f5f3f0';
const LOGO_URL = STORE_URL.replace('/site/pages/index.html', '') + '/site/imgs/logo.jpeg';

function formatMoney(val) {
  return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
}

function baseHtml(content, preview) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Casa Só Pimenta</title>
      <style>
        body { margin: 0; padding: 0; background: ${BG_COLOR}; font-family: 'Courier New', Courier, monospace; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${SECONDARY_COLOR}; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; }
        .header h1 { color: white; margin: 10px 0 0; font-size: 20px; letter-spacing: 2px; }
        .body { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .footer { text-align: center; padding: 30px 20px; font-size: 13px; color: #888; }
        .footer a { color: ${PRIMARY_COLOR}; text-decoration: none; }
        @media (max-width: 480px) { .body { padding: 25px 16px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${LOGO_URL}" alt="${STORE_NAME}">
          <h1>${STORE_NAME}</h1>
        </div>
        <div class="body">${content}</div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${STORE_NAME} — Todos os direitos reservados</p>
          <p><a href="${STORE_URL}">Nosso site</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function adminNewOrderEmail(order) {
  const itemsHtml = order.items.map(function (i) {
    return '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">' + i.item_name + '</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">' + i.quantity + 'x</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">' + formatMoney(i.unit_price) + '</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">' + formatMoney(i.total) + '</td></tr>';
  }).join('');

  return baseHtml(`
    <h2 style="color:${PRIMARY_COLOR};margin-top:0;">Novo pedido #${order.id}</h2>
    <p style="color:#444;font-size:15px;">Um novo pedido foi realizado!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#444;">
      <tr><td style="padding:4px 0;"><strong>Cliente:</strong></td><td style="padding:4px 0;">${order.customer_name}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Telefone:</strong></td><td style="padding:4px 0;">${order.customer_phone}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Email:</strong></td><td style="padding:4px 0;">${order.customer_email || '—'}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Pagamento:</strong></td><td style="padding:4px 0;">${order.payment_method === 'pix' ? 'PIX' : 'Cartão de crédito'}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Entrega:</strong></td><td style="padding:4px 0;">${order.delivery_type === 'pickup' ? 'Retirada' : 'Delivery'}</td></tr>
    </table>
    ${order.delivery_type === 'delivery' ? '<p style="font-size:13px;color:#666;">Endereço: ' + (order.address || '') + ', ' + (order.number || '') + (order.neighborhood ? ' - ' + order.neighborhood : '') + '<br>' + (order.city || '') + (order.state ? '/' + order.state : '') + ' - CEP ' + (order.cep || '') + '</p>' : ''}
    <h3 style="font-size:14px;color:#333;margin:20px 0 8px;">Itens</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:${BG_COLOR};"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:center;">Qtd</th><th style="padding:8px;text-align:right;">Preço</th><th style="padding:8px;text-align:right;">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;color:#333;">
      ${order.delivery_fee > 0 ? '<tr><td style="padding:4px 0;"><strong>Frete:</strong></td><td style="padding:4px 0;text-align:right;">' + formatMoney(order.delivery_fee) + '</td></tr>' : ''}
      ${order.coupon_discount > 0 ? '<tr><td style="padding:4px 0;"><strong>Cupom (' + order.coupon_code + '):</strong></td><td style="padding:4px 0;text-align:right;">-' + formatMoney(order.coupon_discount) + '</td></tr>' : ''}
      <tr><td style="padding:4px 0;font-size:18px;font-weight:bold;color:${PRIMARY_COLOR};"><strong>Total:</strong></td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:bold;color:${PRIMARY_COLOR};">${formatMoney(order.total)}</td></tr>
    </table>
    <a href="${STORE_URL.replace('/site/pages/index.html', '')}/site/pages/admin/pedidos/index.html?id=${order.id}" class="btn" style="display:block;width:260px;margin:30px auto;padding:14px 0;background:${PRIMARY_COLOR};color:white !important;text-align:center;text-decoration:none;font-size:16px;border-radius:8px;font-weight:bold;">Ver pedido no admin</a>
  `);
}

export function customerOrderConfirmationEmail(order) {
  const itemsHtml = order.items.map(function (i) {
    return '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">' + i.item_name + '</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">' + i.quantity + 'x</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">' + formatMoney(i.total) + '</td></tr>';
  }).join('');

  return baseHtml(`
    <h2 style="color:${PRIMARY_COLOR};margin-top:0;">Pedido confirmado!</h2>
    <p style="color:#444;font-size:15px;">Olá, <strong>${order.customer_name}</strong>!</p>
    <p style="color:#444;font-size:15px;">Seu pedido <strong>#${order.id}</strong> foi recebido com sucesso.</p>
    ${order.payment_method === 'pix' ? '<div style="background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:8px;margin:16px 0;text-align:center;"><p style="margin:0;color:#166534;font-size:14px;">💳 <strong>Pagamento via PIX</strong></p><p style="margin:8px 0 0;color:#166534;font-size:13px;">O pagamento será confirmado automaticamente. Acompanhe o status pelo site.</p></div>' : '<div style="background:#fef2f2;border:1px solid #fca5a5;padding:16px;border-radius:8px;margin:16px 0;text-align:center;"><p style="margin:0;color:#991b1b;font-size:14px;">💳 <strong>Pagamento via Cartão de Crédito</strong></p><p style="margin:8px 0 0;color:#991b1b;font-size:13px;">O pagamento será processado pela operadora.</p></div>'}
    <h3 style="font-size:14px;color:#333;margin:20px 0 8px;">Resumo do pedido</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:${BG_COLOR};"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:center;">Qtd</th><th style="padding:8px;text-align:right;">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;color:#333;">
      ${order.delivery_fee > 0 ? '<tr><td style="padding:4px 0;"><strong>Frete:</strong></td><td style="padding:4px 0;text-align:right;">' + formatMoney(order.delivery_fee) + '</td></tr>' : ''}
      ${order.coupon_discount > 0 ? '<tr><td style="padding:4px 0;"><strong>Cupom (' + order.coupon_code + '):</strong></td><td style="padding:4px 0;text-align:right;">-' + formatMoney(order.coupon_discount) + '</td></tr>' : ''}
      <tr><td style="padding:4px 0;font-size:18px;font-weight:bold;color:${PRIMARY_COLOR};"><strong>Total:</strong></td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:bold;color:${PRIMARY_COLOR};">${formatMoney(order.total)}</td></tr>
    </table>
    ${order.delivery_type === 'pickup' ? '<div style="background:${BG_COLOR};padding:16px;border-radius:8px;margin:16px 0;text-align:center;"><p style="margin:0;color:#333;font-size:14px;">📍 <strong>Retirada</strong></p><p style="margin:8px 0 0;color:#666;font-size:13px;">Passamos por aqui em breve para avisar quando estiver pronto! 🙌</p></div>' : '<div style="background:${BG_COLOR};padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0;color:#333;font-size:14px;">🚚 <strong>Entrega</strong></p><p style="margin:8px 0 0;color:#666;font-size:13px;">' + (order.address || '') + ', ' + (order.number || '') + (order.neighborhood ? ' - ' + order.neighborhood : '') + '<br>' + (order.city || '') + (order.state ? '/' + order.state : '') + '</p></div>'}
    <p style="text-align:center;font-size:14px;color:#888;">Qualquer dúvida, responda este email ou entre em contato conosco!</p>
  `);
}

export function forgotPasswordEmail(userName, resetLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de senha</title>
      <style>
        body { margin: 0; padding: 0; background: ${BG_COLOR}; font-family: 'Courier New', Courier, monospace; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${SECONDARY_COLOR}; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; }
        .header h1 { color: white; margin: 10px 0 0; font-size: 20px; letter-spacing: 2px; }
        .body { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .body h2 { color: ${PRIMARY_COLOR}; font-size: 22px; margin-top: 0; text-align: center; }
        .body p { color: #444; font-size: 15px; line-height: 1.6; margin: 16px 0; }
        .btn {
          display: block; width: 260px; margin: 30px auto; padding: 14px 0;
          background: ${PRIMARY_COLOR}; color: white !important;
          text-align: center; text-decoration: none; font-size: 16px;
          border-radius: 8px; font-weight: bold; letter-spacing: 1px;
        }
        .btn:hover { background: #a8321c; }
        .info { background: ${BG_COLOR}; padding: 16px; border-radius: 8px; font-size: 13px; color: #666; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 30px 20px; font-size: 13px; color: #888; }
        .footer a { color: ${PRIMARY_COLOR}; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        @media (max-width: 480px) {
          .body { padding: 25px 16px; }
          .btn { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${LOGO_URL}" alt="${STORE_NAME}">
          <h1>${STORE_NAME}</h1>
        </div>
        <div class="body">
          <h2>Recuperação de senha</h2>
          <p>Olá, <strong>${userName}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetLink}" class="btn">Redefinir senha</a>
          <p style="font-size: 14px; color: #888; text-align: center;">Se o botão não funcionar, copie e cole o link abaixo no navegador:</p>
          <p style="font-size: 12px; color: #aaa; text-align: center; word-break: break-all;">${resetLink}</p>
          <div class="info">
            ⏳ Este link expira em <strong>1 hora</strong>.<br>
            🔒 Se você não solicitou esta recuperação, ignore este email.
          </div>
          <p style="text-align: center; font-size: 14px; color: #888;">Dúvidas? Responda este email ou entre em contato.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${STORE_NAME} — Todos os direitos reservados</p>
          <p>
            <a href="${STORE_URL}">Nosso site</a> &bull;
            <a href="#">Política de privacidade</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
