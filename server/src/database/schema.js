import { pool } from './connection.js';

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT,
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      ingredients TEXT,
      price NUMERIC(10,2) NOT NULL,
      compare_price NUMERIC(10,2),
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active SMALLINT NOT NULL DEFAULT 1,
      is_featured SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      link_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kits (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active SMALLINT NOT NULL DEFAULT 1,
      is_featured SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kit_items (
      id SERIAL PRIMARY KEY,
      kit_id INTEGER NOT NULL,
      product_id INTEGER,
      custom_name TEXT,
      quantity NUMERIC(10,2),
      unit TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      phone TEXT,
      cep TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INTEGER NOT NULL,
      product_id INTEGER,
      kit_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (kit_id) REFERENCES kits(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      cep TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      kit_id INTEGER,
      item_name TEXT NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (kit_id) REFERENCES kits(id)
    );
  `);

  await pool.query(`
    ALTER TABLE kits ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix';
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_external_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cpf TEXT;
  `);

  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price NUMERIC(10,2);
  `);

  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3) NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'delivery';
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS number TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS neighborhood TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS complement TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight NUMERIC(10,3);
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_box TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10,2);
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS box_amount NUMERIC(10,2);
  `);

  await pool.query(`
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code TEXT UNIQUE;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code_generated_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP;
  `);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } catch (err) {
    console.error('Aviso: tabela password_resets já existe ou não pôde ser criada:', err.message);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('store_name', 'Casa Só Pimenta'),
      ('store_description', ''),
      ('store_logo', '/site/imgs/logo.jpeg'),
      ('contact_email', ''),
      ('contact_phone', ''),
      ('contact_address', 'Rua Exemplo, 123 - Centro'),
      ('social_instagram', 'casasopimenta'),
      ('social_facebook', 'casasopimenta'),
      ('payment_methods', 'PIX,Cartão de Crédito'),
      ('pix_key', ''),
      ('pix_key_type', 'CPF'),
      ('pix_recipient_name', ''),
      ('free_shipping_from', ''),
      ('store_hours', 'Seg a Sex: 08h-18h | Sáb: 08h-12h'),
      ('pix_discount_percent', '5'),
      ('social_tiktok', 'casa.so.pimenta')
    ON CONFLICT (key) DO NOTHING;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
      discount_value NUMERIC(10,2) NOT NULL,
      min_order_amount NUMERIC(10,2),
      max_uses INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP,
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id);
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
  `);

  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) NOT NULL DEFAULT 0;
  `);
}
