require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';
const LOW_STOCK_THRESHOLD = 5;
const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
const FR_STATUS = {
  'en attente': 'pending',
  attente: 'pending',
  payee: 'paid',
  paye: 'paid',
  'en preparation': 'processing',
  preparation: 'processing',
  expediee: 'shipped',
  expedie: 'shipped',
  livree: 'delivered',
  livre: 'delivered',
  annulee: 'cancelled',
  annule: 'cancelled'
};

const LOCATIONS = [
  { id: 'lome-centre', name: 'Lomé Centre (Tokoin, Bè, Nyékonakpoè)', fee: 1500 },
  { id: 'agoè', name: 'Agoè / Adidogomé / Légbassito', fee: 2000 },
  { id: 'baguida', name: 'Baguida / Avepozo', fee: 2500 }
];

const SMTP_READY = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER &&
  process.env.SMTP_PASS && process.env.MAIL_FROM
);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});
app.use((req, res, next) => {
  if (/^\/(server\.js|bd\.sql|package\.json|package-lock\.json)/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(__dirname, { dotfiles: 'deny', index: 'index.html' }));

function clean(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 255);
}

function toInt(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'oui', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'non', 'no', 'off'].includes(text)) return false;
  return fallback;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status || 400;
  return error;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function pagination(req, defaultLimit, maxLimit) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(maxLimit || 100, Math.max(1, toInt(req.query.limit, defaultLimit || 20)));
  return { page, limit, offset: (page - 1) * limit };
}

function getUserId(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    return decoded.id || null;
  } catch (_) {
    return null;
  }
}

function selectedLocation(value) {
  return LOCATIONS.find((loc) => loc.id === value || loc.name === value) || null;
}

function applyPromo(promo, subtotal, shipping) {
  if (!promo) return { subtotal, discount: 0, shipping, total: Math.max(0, subtotal + shipping), promo: null };
  if (subtotal < Number(promo.min_amount || 0)) {
    return { subtotal, discount: 0, shipping, total: Math.max(0, subtotal + shipping), promo: null };
  }

  let discount = 0;
  let finalShipping = shipping;
  if (promo.type === 'percent') discount = Math.round((subtotal * Number(promo.value)) / 100);
  if (promo.type === 'fixed') discount = Math.min(subtotal, Number(promo.value));
  if (promo.type === 'free_shipping') finalShipping = 0;

  return {
    subtotal,
    discount,
    shipping: finalShipping,
    total: Math.max(0, subtotal - discount + finalShipping),
    promo
  };
}

function normalizeStatus(value) {
  let text = String(value == null ? '' : value).trim().toLowerCase();
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, ' ').trim();
  if (ORDER_STATUSES.includes(text)) return text;
  return FR_STATUS[text] || null;
}

function customerSegment(totalSpent) {
  if (Number(totalSpent) > 300000) return 'VIP';
  if (Number(totalSpent) > 100000) return 'Fidèle';
  return 'Nouveau';
}

function sendExport(res, baseName, rows, columns, requestedFormat) {
  const format = String(requestedFormat || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
  const data = rows.map((row) => {
    const line = {};
    columns.forEach((column) => {
      line[column.label] = row[column.key] == null ? '' : row[column.key];
    });
    return line;
  });
  const sheet = xlsx.utils.json_to_sheet(data);
  sheet['!cols'] = columns.map((column) => ({ wch: Math.min(60, Math.max(12, String(column.label).length + 2)) }));
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, 'Export');
  const buffer = xlsx.write(book, { type: 'buffer', bookType: format });
  const stamp = new Date().toISOString().slice(0, 10);
  res.set('Content-Disposition', `attachment; filename="${baseName}-${stamp}.${format}"`);
  if (format === 'csv') {
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + buffer.toString('utf8'));
  } else {
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }
}

async function logActivity(req, action, details) {
  try {
    const payload = details == null ? null : JSON.stringify(details).slice(0, 5000);
    await pool.execute(
      'INSERT INTO admin_activity (admin_id, action, details) VALUES (?, ?, ?)',
      [req.user && req.user.id ? req.user.id : null, clean(action, 120), payload]
    );
  } catch (err) {
    console.error('Erreur journalisation admin :', err.message);
  }
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7).trim(), JWT_SECRET);
    if (!decoded.id) return res.status(401).json({ message: 'Session invalide.' });
    req.user = { id: decoded.id, name: decoded.name, email: decoded.email, role: decoded.role };
    next();
  } catch (_) {
    return res.status(401).json({ message: 'Session invalide ou expirée.' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!rows.length || rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('Erreur requireAdmin :', err);
    return res.status(500).json({ message: 'Erreur serveur lors de la vérification des droits.' });
  }
}

async function loadOrder(orderId) {
  const [rows] = await pool.execute(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
     FROM orders o LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  if (!rows.length) return null;
  const order = rows[0];

  const [items] = await pool.execute(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price,
            p.name AS product_name, p.slug AS product_slug, p.image_url,
            (oi.quantity * oi.unit_price) AS line_total
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.id ASC`,
    [orderId]
  );

  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const location = selectedLocation(order.location);
  const shippingFee = location ? location.fee : 0;
  let promo = null;
  if (order.promo_code) {
    const [promoRows] = await pool.execute(
      'SELECT id, code, type, value, min_amount, label FROM promo_codes WHERE code = ? LIMIT 1',
      [order.promo_code]
    );
    if (promoRows.length) promo = promoRows[0];
  }

  const shipping = promo && promo.type === 'free_shipping' ? 0 : shippingFee;
  const total = Number(order.total_amount || 0);
  const discount = Math.max(0, subtotal + shipping - total);
  const client = {
    id: order.user_id || null,
    name: order.customer_name || 'Invité',
    email: order.customer_email || '',
    phone: order.customer_phone || ''
  };

  return {
    ...order,
    customer: client.name,
    client,
    items: items.map((item) => ({
      ...item,
      name: item.product_name || `Produit #${item.product_id}`,
      total: Number(item.line_total || 0)
    })),
    subtotal,
    discount,
    shipping,
    shipping_fee: shippingFee,
    total,
    promo: promo ? { ...promo, discount } : null,
    location_details: location
  };
}

function invoiceNumber(prefix, order) {
  const year = new Date(order.created_at).getFullYear();
  return `${prefix}-${year}-${String(order.id).padStart(4, '0')}`;
}

function buildInvoice(order) {
  const number = invoiceNumber('FACT', order);
  return {
    number,
    numero: number,
    type: 'invoice',
    date: order.created_at,
    created_at: order.created_at,
    status: order.status,
    orderId: order.id,
    customer: order.client,
    client: order.client,
    address: order.location,
    items: order.items.map((item) => ({
      name: item.name,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total: Number(item.total)
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    promo: order.promo ? order.promo.code : null,
    currency: 'FCFA',
    legal: 'IT Haven — facture générée électroniquement, valable sans signature. Montants en FCFA.',
    mentionsLegales: [
      'IT Haven, Lomé (Togo) — service client : contact@ithaven.tg',
      'Montants exprimés en FCFA. Facture valable sans signature.',
      'Les articles restent la propriété d’IT Haven jusqu’au paiement intégral.'
    ]
  };
}

function buildDelivery(order) {
  const number = invoiceNumber('BL', order);
  return {
    number,
    numero: number,
    type: 'delivery',
    date: order.created_at,
    orderId: order.id,
    status: order.status,
    customer: order.client,
    client: order.client,
    address: order.location,
    location: order.location,
    items: order.items.map((item) => ({
      name: item.name,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price)
    })),
    total_quantity: order.items.reduce((sum, item) => sum + Number(item.quantity), 0),
    promo: order.promo ? order.promo.code : null
  };
}

let mailTransporter = null;
function getMailTransporter() {
  if (!SMTP_READY) return null;
  if (!mailTransporter) {
    const port = Number(process.env.SMTP_PORT);
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000
    });
  }
  return mailTransporter;
}

const ABANDONED_CARTS_SQL = `
  SELECT c.* FROM cart_activity c
  WHERE c.items_count > 0
    AND c.updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    AND c.thanked_at IS NULL
    AND (c.reminded_at IS NULL OR c.reminded_at < DATE_SUB(NOW(), INTERVAL 24 HOUR))
  ORDER BY c.updated_at ASC
  LIMIT 100
`;

async function queueAndSendReminders(carts) {
  const transporter = getMailTransporter();
  let sent = 0;
  let queued = 0;
  for (const cart of carts) {
    const [result] = await pool.execute(
      'INSERT INTO cart_reminders (cart_id, session_id, email, status) VALUES (?, ?, ?, ?)',
      [cart.id, cart.session_id, cart.email || null, 'queued']
    );
    if (!transporter || !cart.email) {
      queued += 1;
      continue;
    }
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: cart.email,
        subject: 'Votre panier IT Haven vous attend',
        text: `Bonjour, votre panier de ${cart.items_count} article(s) vous attend toujours sur IT Haven.`,
        html: `<p>Bonjour,</p><p>Votre panier de <strong>${Number(cart.items_count)} article(s)</strong> vous attend toujours sur IT Haven.</p><p>À bientôt,<br>L’équipe IT Haven</p>`
      });
      await pool.execute(
        "UPDATE cart_reminders SET status = 'sent', sent_at = NOW() WHERE id = ?",
        [result.insertId]
      );
      sent += 1;
    } catch (err) {
      await pool.execute(
        "UPDATE cart_reminders SET status = 'failed', error = ? WHERE id = ?",
        [clean(err.message, 500), result.insertId]
      );
      queued += 1;
    }
  }
  if (carts.length) {
    const ids = carts.map((cart) => cart.id);
    const marks = ids.map(() => '?').join(',');
    await pool.execute(`UPDATE cart_activity SET reminded_at = NOW() WHERE id IN (${marks})`, ids);
  }
  return { sent, queued };
}

async function resolveCategoryId(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    const [rows] = await pool.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [Number(raw)]);
    return rows.length ? rows[0].id : null;
  }
  const [rows] = await pool.execute(
    'SELECT id FROM categories WHERE LOWER(slug) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1',
    [raw, raw]
  );
  return rows.length ? rows[0].id : null;
}

async function uniqueSlug(base, currentId) {
  const root = slugify(base) || 'produit';
  let candidate = root;
  let suffix = 2;
  while (true) {
    const [rows] = await pool.execute('SELECT id FROM products WHERE slug = ? LIMIT 1', [candidate]);
    if (!rows.length || (currentId && Number(rows[0].id) === Number(currentId))) return candidate;
    candidate = `${root}-${suffix++}`.slice(0, 220);
  }
}

async function prepareProductData(body, existing) {
  const data = {};
  const name = clean(body.name !== undefined ? body.name : existing && existing.name, 200);
  if (!name) throw httpError('Le nom du produit est obligatoire.', 400);
  data.name = name;

  const categoryValue = body.category_id !== undefined
    ? body.category_id
    : (body.category !== undefined ? body.category : existing && existing.category_id);
  const categoryId = await resolveCategoryId(categoryValue);
  if (!categoryId) throw httpError('Catégorie invalide.', 400);
  data.category_id = categoryId;

  const price = toInt(body.price !== undefined ? body.price : existing && existing.price, null);
  if (!Number.isInteger(price) || price < 0) throw httpError('Prix invalide.', 400);
  data.price = price;

  if (body.promo_price !== undefined) {
    if (body.promo_price === null || body.promo_price === '') {
      data.promo_price = null;
    } else {
      const promoPrice = toInt(body.promo_price, null);
      if (!Number.isInteger(promoPrice) || promoPrice < 0 || promoPrice > price) {
        throw httpError('Le prix promo doit être compris entre 0 et le prix normal.', 400);
      }
      data.promo_price = promoPrice;
    }
  } else {
    data.promo_price = existing ? existing.promo_price : null;
  }

  if (body.stock !== undefined) {
    const stock = toInt(body.stock, null);
    if (!Number.isInteger(stock) || stock < 0) throw httpError('Stock invalide.', 400);
    data.stock = stock;
  } else {
    data.stock = existing ? Number(existing.stock) : 0;
  }

  data.description = body.description !== undefined
    ? clean(body.description, 10000)
    : (existing ? (existing.description || '') : '');

  data.image_url = body.image_url !== undefined
    ? clean(body.image_url, 500)
    : (existing ? existing.image_url : null);

  data.is_new = body.is_new !== undefined
    ? toBool(body.is_new, false)
    : (existing ? toBool(existing.is_new, false) : false);

  return data;
}

async function insertProduct(data, slug) {
  const [result] = await pool.execute(
    `INSERT INTO products (category_id, name, slug, description, price, promo_price, image_url, stock, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.name, slug, data.description, data.price,
      data.promo_price, data.image_url, data.stock, data.is_new ? 1 : 0]
  );
  return result.insertId;
}

async function updateProduct(id, data, slug) {
  const fields = ['category_id', 'name', 'description', 'price', 'promo_price', 'image_url', 'stock', 'is_new'];
  if (slug) fields.push('slug');
  const sets = fields.map((field) => `\`${field}\` = ?`).join(', ');
  const params = fields.map((field) => (field === 'slug' ? slug : (field === 'is_new' ? (data.is_new ? 1 : 0) : data[field])));
  await pool.execute(`UPDATE products SET ${sets} WHERE id = ?`, [...params, id]);
}

async function getProduct(id) {
  const [rows] = await pool.execute(
    `SELECT p.*, c.name AS category, c.slug AS category_slug
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  const [variants] = await pool.execute(
    'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC',
    [id]
  );
  return { ...rows[0], variants };
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, message: 'Base de données indisponible.' });
  }
});

app.get('/api/products/search', async (req, res) => {
  try {
    const q = clean(req.query.q, 100);
    if (!q) return res.status(400).json({ message: 'Mot-clé manquant.' });

    const pattern = `%${q}%`;
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.slug, p.description, p.price, p.promo_price, p.image_url, p.stock,
              p.is_new, p.sales_count, c.name AS category, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?
       ORDER BY p.id DESC
       LIMIT 20`,
      [pattern, pattern, pattern]
    );

    res.json({ query: q, count: rows.length, products: rows });
  } catch (err) {
    console.error('Erreur GET /api/products/search :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.slug, p.description, p.price, p.promo_price, p.image_url, p.stock,
              p.is_new, p.sales_count, c.name AS category, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?
       LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Produit introuvable.' });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error('Erreur GET /api/products/:id :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const filter = clean(req.query.filter, 30).toLowerCase() || 'all';
    const category = clean(req.query.category, 100);
    const q = clean(req.query.q, 100);
    const promoOnly = String(req.query.promo || '') === '1';

    let sql = `
      SELECT p.id, p.name, p.slug, p.description, p.price, p.promo_price, p.image_url, p.stock,
             p.is_new, p.sales_count, c.name AS category, c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1 = 1
    `;
    const params = [];

    if (category && category.toLowerCase() !== 'all') {
      sql += ' AND (LOWER(c.slug) = LOWER(?) OR LOWER(c.name) = LOWER(?))';
      params.push(category, category);
    }
    if (q) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (promoOnly) sql += ' AND p.promo_price IS NOT NULL AND p.promo_price < p.price';

    if (filter === 'new') sql += ' ORDER BY p.id DESC LIMIT 12';
    else if (filter === 'bestsellers') sql += ' ORDER BY p.sales_count DESC, p.id ASC LIMIT 12';
    else sql += ' ORDER BY p.id ASC';

    const [rows] = await pool.execute(sql, params);
    res.json({ count: rows.length, products: rows });
  } catch (err) {
    console.error('Erreur GET /api/products :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des produits.' });
  }
});

app.get('/api/categories/counts', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.name, c.slug, COUNT(p.id) AS total
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id, c.name, c.slug
       ORDER BY c.id ASC`
    );
    const counts = {};
    rows.forEach((row) => {
      counts[row.slug] = Number(row.total);
      counts[row.name] = Number(row.total);
    });
    res.json({ categories: rows, counts, total: rows.length });
  } catch (err) {
    console.error('Erreur GET /api/categories/counts :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/promos', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT id, slug, name FROM promo_categories ORDER BY id ASC'
    );
    const [codes] = await pool.execute(
      `SELECT pc.code, pc.type, pc.value, pc.min_amount, pc.label, pcat.slug AS category
       FROM promo_codes pc
       JOIN promo_categories pcat ON pc.category_id = pcat.id
       WHERE pc.active = 1 AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
       ORDER BY pc.id ASC`
    );
    res.json({ categories, codes });
  } catch (err) {
    console.error('Erreur GET /api/promos :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des codes promo.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = clean(req.body.name, 150);
    const email = clean(req.body.email, 255).toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Cet email est déjà utilisé.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'client']
    );

    const user = { id: result.insertId, name, email, role: 'client' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Compte créé avec succès.', token, user });
  } catch (err) {
    console.error('Erreur POST /api/auth/register :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l’inscription.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = clean(req.body.email, 255).toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis.' });

    const [rows] = await pool.execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Identifiants invalides.' });

    const dbUser = rows[0];
    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) return res.status(401).json({ message: 'Identifiants invalides.' });

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Connexion réussie.', token, user });
  } catch (err) {
    console.error('Erreur POST /api/auth/login :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const name = clean(req.body.name, 120);
    const email = clean(req.body.email, 160);
    const subject = clean(req.body.subject, 120) || 'Information produit';
    const message = clean(req.body.message, 4000);

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nom, email et message sont requis.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    await pool.execute(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );
    res.status(201).json({ message: 'Message envoyé avec succès !' });
  } catch (err) {
    console.error('Erreur POST /api/contact :', err);
    res.status(500).json({ error: 'Erreur serveur lors de l’envoi du message.' });
  }
});

app.post('/api/newsletter', async (req, res) => {
  try {
    const email = clean(req.body.email, 160).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide.' });
    }
    await pool.execute('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)', [email]);
    res.status(201).json({ message: 'Inscription confirmée.' });
  } catch (err) {
    console.error('Erreur POST /api/newsletter :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l’inscription.' });
  }
});

app.post('/api/orders', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length) return res.status(400).json({ message: 'Le panier est vide.' });
    if (rawItems.length > 50) return res.status(400).json({ message: 'Trop d’articles dans le panier.' });

    const location = selectedLocation(req.body.location);
    if (!location) return res.status(400).json({ message: 'Localisation de livraison invalide.' });

    const userId = getUserId(req);
    const items = rawItems.map((item) => ({
      id: Number(item.id),
      qty: Math.floor(Number(item.qty || 1)),
      price: Number(item.price || 0),
      name: clean(item.name, 200)
    }));

    if (items.some((item) => !Number.isInteger(item.id) || item.id <= 0)) {
      return res.status(400).json({ message: 'Produit invalide dans le panier.' });
    }
    if (items.some((item) => !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)) {
      return res.status(400).json({ message: 'Quantité invalide dans le panier.' });
    }

    const ids = [...new Set(items.map((item) => item.id))];
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await pool.execute(
      `SELECT id, price, promo_price, stock FROM products WHERE id IN (${placeholders})`,
      ids
    );
    const productMap = new Map(products.map((row) => [Number(row.id), row]));

    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) return res.status(404).json({ message: `Produit ${item.id} introuvable.` });
      const expectedPrice = Number(product.promo_price || product.price);
      if (Math.abs(expectedPrice - item.price) > 1) {
        return res.status(409).json({ message: 'Le prix du panier a changé. Veuillez le vérifier.' });
      }
      if (Number(product.stock) < item.qty) {
        return res.status(409).json({ message: `Stock insuffisant pour le produit ${item.name || item.id}.` });
      }
      subtotal += expectedPrice * item.qty;
    }

    let promo = null;
    const promoCode = clean(req.body.promoCode, 50).toUpperCase();
    if (promoCode) {
      const [rows] = await pool.execute(
        `SELECT pc.code, pc.type, pc.value, pc.min_amount, pc.label, pcat.slug AS category
         FROM promo_codes pc
         JOIN promo_categories pcat ON pc.category_id = pcat.id
         WHERE pc.code = ? AND pc.active = 1 AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
         LIMIT 1`,
        [promoCode]
      );
      if (!rows.length) return res.status(400).json({ message: 'Code promo invalide ou expiré.' });
      promo = rows[0];
    }

    const totals = applyPromo(promo, subtotal, location.fee);

    await connection.beginTransaction();
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, total_amount, location, promo_code, status) VALUES (?, ?, ?, ?, ?)',
      [userId, totals.total, location.name, promo ? promo.code : null, 'pending']
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      const product = productMap.get(item.id);
      const unitPrice = Number(product.promo_price || product.price);
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.qty, unitPrice]
      );
      await connection.execute(
        'UPDATE products SET stock = stock - ?, sales_count = sales_count + ? WHERE id = ?',
        [item.qty, item.qty, item.id]
      );
    }

    await connection.commit();
    res.status(201).json({
      message: 'Commande validée.',
      orderId,
      total: totals.total,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {}
    console.error('Erreur POST /api/orders :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la commande.' });
  } finally {
    connection.release();
  }
});

app.post('/api/track/visit', async (req, res) => {
  try {
    const sessionId = clean(req.body.sessionId || req.body.session_id, 100);
    if (!sessionId) return res.status(400).json({ message: 'Session invalide.' });
    await pool.execute(
      `INSERT INTO site_visits (session_id) VALUES (?)
       ON DUPLICATE KEY UPDATE last_seen = NOW(), visits = visits + 1`,
      [sessionId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /api/track/visit :', err);
    res.status(500).json({ message: 'Erreur serveur lors du suivi de visite.' });
  }
});

app.post('/api/track/cart', async (req, res) => {
  try {
    const sessionId = clean(req.body.sessionId || req.body.session_id, 100);
    if (!sessionId) return res.status(400).json({ message: 'Session invalide.' });
    const email = clean(req.body.email, 255).toLowerCase();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide.' });
    }
    const itemsCount = toInt(req.body.itemsCount, null);
    const total = toInt(req.body.total, null);
    if (!Number.isInteger(itemsCount) || itemsCount < 0) {
      return res.status(400).json({ message: 'Nombre d’articles invalide.' });
    }
    if (!Number.isInteger(total) || total < 0) {
      return res.status(400).json({ message: 'Total du panier invalide.' });
    }

    await pool.execute(
      `INSERT INTO cart_activity (session_id, email, items_count, total, thanked_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         items_count = VALUES(items_count),
         total = VALUES(total),
         updated_at = NOW(),
         thanked_at = IF(VALUES(items_count) = 0, NOW(), NULL)`,
      [sessionId, email || null, itemsCount, total, itemsCount === 0 ? new Date() : null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erreur POST /api/track/cart :', err);
    res.status(500).json({ message: 'Erreur serveur lors du suivi du panier.' });
  }
});

app.use('/api/admin', requireAuth);
app.use('/api/admin', requireAdmin);

app.get('/api/admin/me', async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [[totals], [visits], [bestSellers], [lowStock], [recentOrders], [paidCount]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
         FROM orders`
      ),
      pool.execute('SELECT COUNT(*) AS visitors, COALESCE(SUM(visits), 0) AS totalVisits FROM site_visits'),
      pool.execute(
        `SELECT p.id, p.name, SUM(oi.quantity) AS quantity,
                SUM(oi.quantity * oi.unit_price) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.status <> 'cancelled'
         GROUP BY p.id, p.name
         ORDER BY quantity DESC, p.id ASC
         LIMIT 5`
      ),
      pool.execute(
        `SELECT id, name, stock FROM products
         WHERE stock <= ? ORDER BY stock ASC, id ASC LIMIT 10`,
        [LOW_STOCK_THRESHOLD]
      ),
      pool.execute(
        `SELECT o.id, o.total_amount, o.location, o.status, o.created_at,
                COALESCE(u.name, 'Invité') AS customer, u.email AS customer_email
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.id DESC LIMIT 5`
      ),
      pool.execute("SELECT COUNT(*) AS n FROM orders WHERE status <> 'cancelled'")
    ]);

    let sellers = bestSellers;
    if (!sellers.length) {
      const [fallback] = await pool.execute(
        `SELECT id, name, sales_count AS quantity, (sales_count * price) AS revenue
         FROM products ORDER BY sales_count DESC, id ASC LIMIT 5`
      );
      sellers = fallback;
    }

    const orderCount = Number(totals[0].orders);
    const revenue = Number(totals[0].revenue);
    const visitors = Number(visits[0].visitors);
    const billableOrders = Number(paidCount[0].n);

    res.json({
      revenue,
      orders: orderCount,
      averageOrder: billableOrders ? Math.round((revenue / billableOrders) * 100) / 100 : 0,
      conversionRate: visitors ? Math.round((orderCount / visitors) * 10000) / 100 : 0,
      visits: visitors,
      totalVisits: Number(visits[0].totalVisits),
      bestSellers: sellers.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue)
      })),
      lowStock: lowStock.map((row) => ({ id: row.id, name: row.name, stock: Number(row.stock) })),
      recentOrders: recentOrders.map((row) => ({
        id: row.id,
        total_amount: Number(row.total_amount),
        location: row.location,
        status: row.status,
        created_at: row.created_at,
        customer: row.customer,
        customer_email: row.customer_email
      }))
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/dashboard :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement du tableau de bord.' });
  }
});

app.get('/api/admin/products/export', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.slug, p.description, p.price, p.promo_price, p.image_url,
              p.stock, p.is_new, c.name AS category
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.id ASC`
    );
    const formatted = rows.map((row) => ({ ...row, is_new: row.is_new ? 1 : 0 }));
    sendExport(res, 'produits-ithaven', formatted, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'name' },
      { key: 'slug', label: 'slug' },
      { key: 'category', label: 'category' },
      { key: 'price', label: 'price' },
      { key: 'promo_price', label: 'promo_price' },
      { key: 'stock', label: 'stock' },
      { key: 'is_new', label: 'is_new' },
      { key: 'image_url', label: 'image_url' },
      { key: 'description', label: 'description' }
    ], req.query.format);
    await logActivity(req, 'products.export', { format: String(req.query.format || 'csv'), rows: rows.length });
  } catch (err) {
    console.error('Erreur GET /api/admin/products/export :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l’export des produits.' });
  }
});

app.post('/api/admin/products/import', async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : null;
    if (!rows) return res.status(400).json({ message: 'Le champ rows doit être un tableau.' });
    if (rows.length > 500) return res.status(400).json({ message: 'Import limité à 500 lignes.' });
    const mode = String(req.body.mode || 'create').toLowerCase();
    if (!['create', 'update'].includes(mode)) {
      return res.status(400).json({ message: 'Mode invalide (create ou update attendu).' });
    }

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw httpError('Ligne invalide.', 400);
        }
        if (mode === 'create') {
          const data = await prepareProductData(row, null);
          const slug = await uniqueSlug(row.slug || data.name, null);
          await insertProduct(data, slug);
          created += 1;
        } else {
          const id = toInt(row.id, null);
          const [found] = id
            ? await pool.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id])
            : await pool.execute('SELECT * FROM products WHERE slug = ? LIMIT 1', [clean(row.slug, 220)]);
          if (!found.length) throw httpError('Produit introuvable.', 404);
          const data = await prepareProductData(row, found[0]);
          const slug = row.slug !== undefined
            ? await uniqueSlug(row.slug || data.name, found[0].id)
            : found[0].slug;
          await updateProduct(found[0].id, data, slug);
          updated += 1;
        }
      } catch (err) {
        errors.push({
          row: index + 1,
          message: err.code === 'ER_DUP_ENTRY' ? 'Slug ou valeur dupliquée.' : err.message
        });
      }
    }

    await logActivity(req, 'products.import', { mode, created, updated, errors: errors.length });
    res.json({ created, updated, errors });
  } catch (err) {
    console.error('Erreur POST /api/admin/products/import :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l’import des produits.' });
  }
});

app.get('/api/admin/products', async (req, res) => {
  try {
    const { page, limit, offset } = pagination(req, 20, 100);
    const search = clean(req.query.search, 100);
    const category = clean(req.query.category, 100);
    const params = [];
    let where = 'WHERE 1 = 1';

    if (search) {
      const pattern = `%${search}%`;
      where += ' AND (p.name LIKE ? OR p.slug LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
      params.push(pattern, pattern, pattern, pattern);
    }
    if (category && category.toLowerCase() !== 'all') {
      where += ' AND (LOWER(c.slug) = LOWER(?) OR LOWER(c.name) = LOWER(?))';
      params.push(category, category);
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
        params
      ),
      pool.execute(
        `SELECT p.*, c.name AS category, c.slug AS category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
    ]);

    const ids = rows.map((row) => row.id);
    const variantMap = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [variants] = await pool.execute(
        `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY id ASC`,
        ids
      );
      variants.forEach((variant) => {
        if (!variantMap.has(variant.product_id)) variantMap.set(variant.product_id, []);
        variantMap.get(variant.product_id).push(variant);
      });
    }

    res.json({
      products: rows.map((row) => ({ ...row, variants: variantMap.get(row.id) || [] })),
      total: Number(countRows[0].total),
      page,
      limit
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/products :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des produits.' });
  }
});

app.get('/api/admin/products/:id', async (req, res) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable.' });
    res.json({ product });
  } catch (err) {
    console.error('Erreur GET /api/admin/products/:id :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const data = await prepareProductData(req.body || {}, null);
    const slug = await uniqueSlug(req.body.slug || data.name, null);
    const id = await insertProduct(data, slug);
    const product = await getProduct(id);
    await logActivity(req, 'products.create', { id, name: data.name });
    res.status(201).json({ product });
  } catch (err) {
    console.error('Erreur POST /api/admin/products :', err);
    const status = err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500);
    res.status(status).json({ message: status === 500 ? 'Erreur serveur lors de la création du produit.' : err.message });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Produit introuvable.' });
    const data = await prepareProductData(req.body || {}, existing[0]);
    const slug = req.body.slug !== undefined
      ? await uniqueSlug(req.body.slug || data.name, existing[0].id)
      : existing[0].slug;
    await updateProduct(existing[0].id, data, slug);
    const product = await getProduct(existing[0].id);
    await logActivity(req, 'products.update', { id: existing[0].id, name: data.name });
    res.json({ product });
  } catch (err) {
    console.error('Erreur PUT /api/admin/products/:id :', err);
    const status = err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500);
    res.status(status).json({ message: status === 500 ? 'Erreur serveur lors de la modification du produit.' : err.message });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const [linked] = await pool.execute(
      'SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?',
      [req.params.id]
    );
    if (Number(linked[0].n) > 0) {
      return res.status(409).json({ message: 'Produit lié à des commandes : suppression impossible.' });
    }
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Produit introuvable.' });
    await logActivity(req, 'products.delete', { id: Number(req.params.id) });
    res.json({ message: 'Produit supprimé.' });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/products/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du produit.' });
  }
});

app.get('/api/admin/products/:id/variants', async (req, res) => {
  try {
    const [product] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [req.params.id]);
    if (!product.length) return res.status(404).json({ message: 'Produit introuvable.' });
    const [variants] = await pool.execute(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [req.params.id]
    );
    res.json({ variants });
  } catch (err) {
    console.error('Erreur GET /api/admin/products/:id/variants :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des variantes.' });
  }
});

app.post('/api/admin/products/:id/variants', async (req, res) => {
  try {
    const [product] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [req.params.id]);
    if (!product.length) return res.status(404).json({ message: 'Produit introuvable.' });
    const name = clean(req.body.name, 150);
    if (!name) return res.status(400).json({ message: 'Nom de variante obligatoire.' });
    const price = req.body.price === null || req.body.price === '' ? null : toInt(req.body.price, null);
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      return res.status(400).json({ message: 'Prix de variante invalide.' });
    }
    const stock = toInt(req.body.stock, 0);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: 'Stock de variante invalide.' });
    }
    const [result] = await pool.execute(
      `INSERT INTO product_variants (product_id, name, sku, price, stock, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, name, clean(req.body.sku, 100) || null, price, stock, toBool(req.body.active, true) ? 1 : 0]
    );
    const [variants] = await pool.execute('SELECT * FROM product_variants WHERE id = ?', [result.insertId]);
    await logActivity(req, 'variants.create', { productId: Number(req.params.id), id: result.insertId });
    res.status(201).json({ variant: variants[0] });
  } catch (err) {
    console.error('Erreur POST /api/admin/products/:id/variants :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la variante.' });
  }
});

app.put('/api/admin/variants/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM product_variants WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Variante introuvable.' });
    const name = req.body.name !== undefined ? clean(req.body.name, 150) : existing[0].name;
    if (!name) return res.status(400).json({ message: 'Nom de variante obligatoire.' });
    let price = existing[0].price;
    if (req.body.price !== undefined) {
      price = req.body.price === null || req.body.price === '' ? null : toInt(req.body.price, null);
      if (price !== null && (!Number.isInteger(price) || price < 0)) {
        return res.status(400).json({ message: 'Prix de variante invalide.' });
      }
    }
    const stock = req.body.stock !== undefined ? toInt(req.body.stock, null) : Number(existing[0].stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: 'Stock de variante invalide.' });
    }
    const sku = req.body.sku !== undefined ? (clean(req.body.sku, 100) || null) : existing[0].sku;
    const active = req.body.active !== undefined ? toBool(req.body.active, true) : toBool(existing[0].active, true);

    await pool.execute(
      'UPDATE product_variants SET name = ?, sku = ?, price = ?, stock = ?, active = ? WHERE id = ?',
      [name, sku, price, stock, active ? 1 : 0, req.params.id]
    );
    const [variants] = await pool.execute('SELECT * FROM product_variants WHERE id = ?', [req.params.id]);
    await logActivity(req, 'variants.update', { id: Number(req.params.id) });
    res.json({ variant: variants[0] });
  } catch (err) {
    console.error('Erreur PUT /api/admin/variants/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la modification de la variante.' });
  }
});

app.delete('/api/admin/variants/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM product_variants WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Variante introuvable.' });
    await logActivity(req, 'variants.delete', { id: Number(req.params.id) });
    res.json({ message: 'Variante supprimée.' });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/variants/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la variante.' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { page, limit, offset } = pagination(req, 20, 100);
    const search = clean(req.query.search, 100);
    const status = clean(req.query.status, 30).toLowerCase();
    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    const params = [];
    let where = 'WHERE 1 = 1';
    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (search) {
      const pattern = `%${search}%`;
      let clause = '(LOWER(u.name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?) OR LOWER(o.location) LIKE LOWER(?) OR LOWER(COALESCE(o.promo_code, \'\')) LIKE LOWER(?))';
      const searchParams = [pattern, pattern, pattern, pattern];
      if (/^\d+$/.test(search)) {
        clause += ' OR o.id = ?';
        searchParams.push(Number(search));
      }
      where += ` AND (${clause})`;
      params.push(...searchParams);
    }

    const [[countRows], [rows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where}`,
        params
      ),
      pool.execute(
        `SELECT o.id, o.user_id, o.total_amount, o.location, o.promo_code, o.status, o.created_at,
                COALESCE(u.name, 'Invité') AS customer, u.email AS customer_email
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
    ]);

    res.json({
      orders: rows.map((row) => ({ ...row, total_amount: Number(row.total_amount) })),
      total: Number(countRows[0].total),
      page,
      limit
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/orders :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des commandes.' });
  }
});

app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
    res.json({ order });
  } catch (err) {
    console.error('Erreur GET /api/admin/orders/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement de la commande.' });
  }
});

app.get('/api/admin/orders/:id/invoice', async (req, res) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
    res.json({ invoice: buildInvoice(order) });
  } catch (err) {
    console.error('Erreur GET /api/admin/orders/:id/invoice :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la génération de la facture.' });
  }
});

app.get('/api/admin/orders/:id/delivery', async (req, res) => {
  try {
    const order = await loadOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
    res.json({ delivery: buildDelivery(order) });
  } catch (err) {
    console.error('Erreur GET /api/admin/orders/:id/delivery :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du bon de livraison.' });
  }
});

app.patch('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    if (!status) return res.status(400).json({ message: 'Statut invalide.' });
    const [result] = await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Commande introuvable.' });
    const order = await loadOrder(req.params.id);
    await logActivity(req, 'orders.status', { id: Number(req.params.id), status });
    res.json({ order });
  } catch (err) {
    console.error('Erreur PATCH /api/admin/orders/:id/status :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut.' });
  }
});

app.get('/api/admin/promos', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT id, slug, name FROM promo_categories ORDER BY id ASC');
    const [codes] = await pool.execute(
      `SELECT pc.*, pcat.slug AS category_slug, pcat.name AS category_name
       FROM promo_codes pc JOIN promo_categories pcat ON pcat.id = pc.category_id
       ORDER BY pc.id DESC`
    );
    const [flashSales] = await pool.execute(
      `SELECT fs.*, p.name AS product_name FROM flash_sales fs
       LEFT JOIN products p ON p.id = fs.product_id
       ORDER BY fs.id DESC`
    );
    res.json({ categories, codes, flashSales });
  } catch (err) {
    console.error('Erreur GET /api/admin/promos :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des promotions.' });
  }
});

async function preparePromoData(body, existing) {
  const code = clean(body.code !== undefined ? body.code : existing && existing.code, 50).toUpperCase();
  if (!code) throw httpError('Code promo obligatoire.', 400);
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw httpError('Code promo invalide (lettres, chiffres, - et _ uniquement).', 400);
  }

  const type = clean(body.type !== undefined ? body.type : existing && existing.type, 30).toLowerCase();
  if (!['percent', 'fixed', 'free_shipping'].includes(type)) throw httpError('Type de promotion invalide.', 400);

  let categoryId = toInt(body.category_id, null);
  if (body.category_id === undefined && body.category && !categoryId) {
    const [rows] = await pool.execute(
      'SELECT id FROM promo_categories WHERE LOWER(slug) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1',
      [clean(body.category, 60), clean(body.category, 100)]
    );
    if (rows.length) categoryId = rows[0].id;
  }
  if (!categoryId && body.category_id === undefined) {
    const slug = type === 'free_shipping' ? 'shipping' : type;
    const [rows] = await pool.execute('SELECT id FROM promo_categories WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length) categoryId = rows[0].id;
  }
  if (!categoryId) categoryId = existing ? existing.category_id : null;
  if (!categoryId) throw httpError('Catégorie promo invalide.', 400);

  const value = toInt(body.value !== undefined ? body.value : existing && existing.value, null);
  if (!Number.isInteger(value) || value < 0) throw httpError('Valeur invalide.', 400);
  if (type === 'percent' && value > 100) throw httpError('Le pourcentage doit être inférieur à 100.', 400);

  const minAmount = toInt(
    body.min_amount !== undefined ? body.min_amount : (existing ? existing.min_amount : 0),
    null
  );
  if (!Number.isInteger(minAmount) || minAmount < 0) throw httpError('Montant minimum invalide.', 400);

  const label = clean(body.label !== undefined ? body.label : existing && existing.label, 150) || code;
  let expiresAt = existing ? existing.expires_at : null;
  if (body.expires_at !== undefined) {
    expiresAt = body.expires_at === null || body.expires_at === '' ? null : parseDate(body.expires_at);
    if (body.expires_at && !expiresAt) throw httpError('Date d’expiration invalide.', 400);
  }

  return {
    code,
    category_id: categoryId,
    type,
    value,
    min_amount: minAmount,
    label,
    active: toBool(body.active, existing ? toBool(existing.active, true) : true),
    expires_at: expiresAt
  };
}

app.post('/api/admin/promos', async (req, res) => {
  try {
    const data = await preparePromoData(req.body || {}, null);
    const [result] = await pool.execute(
      `INSERT INTO promo_codes (code, category_id, type, value, min_amount, label, active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.code, data.category_id, data.type, data.value, data.min_amount, data.label,
        data.active ? 1 : 0, data.expires_at]
    );
    const [rows] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [result.insertId]);
    await logActivity(req, 'promos.create', { id: result.insertId, code: data.code });
    res.status(201).json({ promo: rows[0] });
  } catch (err) {
    console.error('Erreur POST /api/admin/promos :', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ce code promo existe déjà.' });
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Erreur serveur lors de la création du code promo.' });
  }
});

app.put('/api/admin/promos/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM promo_codes WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Code promo introuvable.' });
    const data = await preparePromoData(req.body || {}, existing[0]);
    await pool.execute(
      `UPDATE promo_codes SET code = ?, category_id = ?, type = ?, value = ?, min_amount = ?,
        label = ?, active = ?, expires_at = ? WHERE id = ?`,
      [data.code, data.category_id, data.type, data.value, data.min_amount, data.label,
        data.active ? 1 : 0, data.expires_at, req.params.id]
    );
    const [rows] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    await logActivity(req, 'promos.update', { id: Number(req.params.id), code: data.code });
    res.json({ promo: rows[0] });
  } catch (err) {
    console.error('Erreur PUT /api/admin/promos/:id :', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ce code promo existe déjà.' });
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Erreur serveur lors de la modification du code promo.' });
  }
});

app.delete('/api/admin/promos/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Code promo introuvable.' });
    await logActivity(req, 'promos.delete', { id: Number(req.params.id) });
    res.json({ message: 'Code promo supprimé.' });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/promos/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du code promo.' });
  }
});

app.post('/api/admin/flash-sales', async (req, res) => {
  try {
    const productId = toInt(req.body.productId || req.body.product_id, null);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Produit invalide.' });
    }
    const [product] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!product.length) return res.status(404).json({ message: 'Produit introuvable.' });

    const discountPercent = toInt(
      req.body.discountPercent !== undefined ? req.body.discountPercent : req.body.discount_percent,
      null
    );
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      return res.status(400).json({ message: 'Remise invalide (1 à 100 %).' });
    }

    const startsAt = parseDate(req.body.startsAt || req.body.starts_at) || parseDate(new Date());
    const endsRaw = req.body.endsAt || req.body.ends_at;
    let endsAt = endsRaw ? parseDate(endsRaw) : null;
    if (!endsAt) {
      const date = new Date(startsAt.replace(' ', 'T') + 'Z');
      date.setUTCDate(date.getUTCDate() + 7);
      endsAt = date.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (!startsAt || new Date(endsAt.replace(' ', 'T') + 'Z') <= new Date(startsAt.replace(' ', 'T') + 'Z')) {
      return res.status(400).json({ message: 'Les dates de la vente flash sont invalides.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO flash_sales (product_id, discount_percent, starts_at, ends_at, active)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, discountPercent, startsAt, endsAt, toBool(req.body.active, true) ? 1 : 0]
    );
    const [rows] = await pool.execute('SELECT * FROM flash_sales WHERE id = ?', [result.insertId]);
    await logActivity(req, 'flashSales.create', { id: result.insertId, productId, discountPercent });
    res.status(201).json({ flashSale: rows[0] });
  } catch (err) {
    console.error('Erreur POST /api/admin/flash-sales :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la vente flash.' });
  }
});

app.delete('/api/admin/flash-sales/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM flash_sales WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Vente flash introuvable.' });
    await logActivity(req, 'flashSales.delete', { id: Number(req.params.id) });
    res.json({ message: 'Vente flash supprimée.' });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/flash-sales/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la vente flash.' });
  }
});

app.get('/api/admin/loyalty', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id AS user_id, u.name, u.email,
              COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS totalSpent,
              COUNT(o.id) AS ordersCount,
              COALESCE(lm.points, FLOOR(COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) / 100)) AS points,
              lm.joined_at
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       LEFT JOIN loyalty_members lm ON lm.email = u.email
       WHERE u.role = 'client'
       GROUP BY u.id, u.name, u.email, lm.points, lm.joined_at
       ORDER BY totalSpent DESC, u.id ASC`
    );
    const [referrals] = await pool.execute('SELECT * FROM referral_codes ORDER BY id DESC');
    res.json({
      members: rows.map((row) => ({
        id: row.user_id,
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        points: Number(row.points),
        tier: customerSegment(row.totalSpent),
        totalSpent: Number(row.totalSpent),
        ordersCount: Number(row.ordersCount),
        joined_at: row.joined_at
      })),
      referrals
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/loyalty :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement de la fidélisation.' });
  }
});

app.post('/api/admin/referrals', async (req, res) => {
  try {
    const code = clean(req.body.code, 50).toUpperCase();
    if (!code || !/^[A-Z0-9_-]+$/.test(code)) return res.status(400).json({ message: 'Code de parrainage invalide.' });
    const reward = toInt(req.body.reward, null);
    const discount = toInt(req.body.discount, null);
    if (!Number.isInteger(reward) || reward < 0) return res.status(400).json({ message: 'Récompense invalide.' });
    if (!Number.isInteger(discount) || discount < 0) return res.status(400).json({ message: 'Remise invalide.' });

    const [result] = await pool.execute(
      'INSERT INTO referral_codes (code, reward, discount, active) VALUES (?, ?, ?, ?)',
      [code, reward, discount, toBool(req.body.active, true) ? 1 : 0]
    );
    const [rows] = await pool.execute('SELECT * FROM referral_codes WHERE id = ?', [result.insertId]);
    await logActivity(req, 'referrals.create', { id: result.insertId, code });
    res.status(201).json({ referral: rows[0] });
  } catch (err) {
    console.error('Erreur POST /api/admin/referrals :', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ce code de parrainage existe déjà.' });
    res.status(500).json({ message: 'Erreur serveur lors de la création du parrainage.' });
  }
});

app.delete('/api/admin/referrals/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM referral_codes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Code de parrainage introuvable.' });
    await logActivity(req, 'referrals.delete', { id: Number(req.params.id) });
    res.json({ message: 'Code de parrainage supprimé.' });
  } catch (err) {
    console.error('Erreur DELETE /api/admin/referrals/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du parrainage.' });
  }
});

app.get('/api/admin/abandoned-carts', async (req, res) => {
  try {
    const [rows] = await pool.execute(ABANDONED_CARTS_SQL);
    res.json({
      carts: rows.map((row) => ({
        ...row,
        total: Number(row.total),
        items_count: Number(row.items_count)
      }))
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/abandoned-carts :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des paniers abandonnés.' });
  }
});

app.post('/api/admin/abandoned-carts/remind', async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body.ids) ? req.body.ids : null;
    if (!rawIds || !rawIds.length) return res.status(400).json({ message: 'Aucun panier sélectionné.' });
    const ids = [...new Set(rawIds.map((value) => toInt(value, null)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return res.status(400).json({ message: 'Identifiants invalides.' });
    if (ids.length > 100) return res.status(400).json({ message: '100 paniers maximum par relance.' });

    const placeholders = ids.map(() => '?').join(',');
    const [carts] = await pool.execute(
      `SELECT * FROM cart_activity WHERE id IN (${placeholders}) AND items_count > 0`,
      ids
    );
    const result = await queueAndSendReminders(carts);
    if (carts.length) {
      const cartIds = carts.map((cart) => cart.id);
      const marks = cartIds.map(() => '?').join(',');
      await pool.execute(
        `UPDATE cart_activity SET reminded_at = NOW() WHERE id IN (${marks})`,
        cartIds
      );
    }
    await logActivity(req, 'abandonedCarts.remind', { ids, ...result });
    res.json(result);
  } catch (err) {
    console.error('Erreur POST /api/admin/abandoned-carts/remind :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la relance des paniers.' });
  }
});

async function loadCustomers(query) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
            COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS totalSpent,
            COUNT(o.id) AS ordersCount,
            MAX(o.created_at) AS last_order_at
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'client'
     GROUP BY u.id, u.name, u.email, u.phone, u.created_at
     ORDER BY totalSpent DESC, u.id ASC`
  );
  const search = clean(query.search, 100).toLowerCase();
  const segment = clean(query.segment, 30).toLowerCase();

  return rows
    .map((row) => ({
      ...row,
      totalSpent: Number(row.totalSpent),
      ordersCount: Number(row.ordersCount),
      segment: customerSegment(row.totalSpent)
    }))
    .filter((row) => {
      if (search && !(`${row.name} ${row.email}`.toLowerCase().includes(search))) return false;
      if (segment && row.segment.toLowerCase() !== segment) return false;
      return true;
    });
}

app.get('/api/admin/customers/export', async (req, res) => {
  try {
    const customers = await loadCustomers(req.query);
    sendExport(res, 'clients-ithaven', customers, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'name' },
      { key: 'email', label: 'email' },
      { key: 'phone', label: 'phone' },
      { key: 'totalSpent', label: 'totalSpent' },
      { key: 'ordersCount', label: 'ordersCount' },
      { key: 'segment', label: 'segment' },
      { key: 'created_at', label: 'created_at' }
    ], req.query.format);
    await logActivity(req, 'customers.export', { format: String(req.query.format || 'csv'), rows: customers.length });
  } catch (err) {
    console.error('Erreur GET /api/admin/customers/export :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l’export des clients.' });
  }
});

app.get('/api/admin/customers', async (req, res) => {
  try {
    const customers = await loadCustomers(req.query);
    res.json({ customers, total: customers.length });
  } catch (err) {
    console.error('Erreur GET /api/admin/customers :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement des clients.' });
  }
});

app.get('/api/admin/customers/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS totalSpent,
              COUNT(*) AS ordersCount
       FROM orders WHERE user_id = ?`,
      [req.params.id]
    );
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (!users.length) return res.status(404).json({ message: 'Client introuvable.' });
    const spent = Number(rows[0].totalSpent);
    const customer = {
      ...users[0],
      totalSpent: spent,
      ordersCount: Number(rows[0].ordersCount),
      segment: customerSegment(spent)
    };
    const [orders] = await pool.execute(
      `SELECT id, total_amount, location, promo_code, status, created_at
       FROM orders WHERE user_id = ? ORDER BY id DESC`,
      [req.params.id]
    );
    res.json({
      customer,
      orders: orders.map((order) => ({ ...order, total_amount: Number(order.total_amount) }))
    });
  } catch (err) {
    console.error('Erreur GET /api/admin/customers/:id :', err);
    res.status(500).json({ message: 'Erreur serveur lors du chargement du client.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint introuvable.' });
});

app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err.message);
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ message: status === 500 ? 'Erreur serveur.' : err.message });
});

const reminderTimer = setInterval(async () => {
  try {
    const [carts] = await pool.execute(ABANDONED_CARTS_SQL);
    if (!carts.length) return;
    const result = await queueAndSendReminders(carts);
    const ids = carts.map((cart) => cart.id);
    const marks = ids.map(() => '?').join(',');
    await pool.execute(`UPDATE cart_activity SET reminded_at = NOW() WHERE id IN (${marks})`, ids);
    if (result.sent || result.queued) {
      console.log(`Relances paniers : ${result.sent} envoyé(s), ${result.queued} en file d’attente.`);
    }
  } catch (err) {
    console.error('Erreur relance automatique des paniers :', err.message);
  }
}, REMINDER_INTERVAL_MS);
if (typeof reminderTimer.unref === 'function') reminderTimer.unref();

app.listen(PORT, () => {
  console.log(`Serveur IT Haven lancé sur http://localhost:${PORT}`);
});

