import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("affiliate.db");
db.pragma('foreign_keys = ON');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'affiliate', -- 'admin' or 'affiliate'
    balance REAL DEFAULT 0,
    whatsapp TEXT,
    pix TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  // Migration: Add columns if they don't exist
  try { db.exec("ALTER TABLE users ADD COLUMN whatsapp TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN pix TEXT"); } catch(e) {}

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    commission_rate REAL NOT NULL,
    purchase_url TEXT,
    image_url TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS affiliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    affiliate_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliation_id INTEGER,
    amount REAL NOT NULL,
    commission REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'refunded'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(affiliation_id) REFERENCES affiliations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliation_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(affiliation_id) REFERENCES affiliations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    affiliation_id INTEGER,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(affiliation_id) REFERENCES affiliations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed Settings if not exists
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get().count;
if (settingsCount === 0) {
  const defaultSettings = [
    ['system_name', 'AffiliMaster'],
    ['min_withdrawal', '50'],
    ['default_commission', '10'],
    ['support_email', 'suporte@affilimaster.com'],
    ['allow_deletion', 'true'],
    ['auto_approve_withdrawals', 'false']
  ];
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  defaultSettings.forEach(([key, value]) => insertSetting.run(key, value));
}

// Seed Admin if not exists
const adminEmail = "tiagolimacamposoficial@gmail.com";
const adminPassword = "tiagolima123";
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);

if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Tiago Lima",
    adminEmail,
    hashedPassword,
    "admin"
  );
} else if (existingAdmin.role !== 'admin') {
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(adminEmail);
}

// Migration: Hash existing plain text passwords
const users = db.prepare("SELECT id, password FROM users").all();
users.forEach(u => {
  if (!u.password.startsWith("$2a$") && !u.password.startsWith("$2b$")) {
    const hashed = bcrypt.hashSync(u.password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, u.id);
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Admin: Dashboard Stats
  app.get("/api/admin/stats", (req, res) => {
    const totalSales = db.prepare("SELECT SUM(amount) as total FROM sales WHERE status = 'completed'").get().total || 0;
    const totalCommission = db.prepare("SELECT SUM(commission) as total FROM sales WHERE status = 'completed'").get().total || 0;
    const totalAffiliates = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'affiliate'").get().count;
    const pendingWithdrawals = db.prepare("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'pending'").get().total || 0;
    
    res.json({ totalSales, totalCommission, totalAffiliates, pendingWithdrawals });
  });

  // Admin: Products
  app.get("/api/admin/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/admin/products", (req, res) => {
    const { name, description, price, commission_rate, purchase_url, image_url } = req.body;
    const result = db.prepare("INSERT INTO products (name, description, price, commission_rate, purchase_url, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(
      name, description, price, commission_rate, purchase_url, image_url
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/admin/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Admin: Leads
  app.get("/api/admin/leads", (req, res) => {
    const leads = db.prepare(`
      SELECT l.*, p.name as product_name, u.name as affiliate_name 
      FROM leads l 
      JOIN affiliations a ON l.affiliation_id = a.id 
      JOIN products p ON a.product_id = p.id 
      JOIN users u ON a.user_id = u.id 
      ORDER BY l.created_at DESC
    `).all();
    res.json(leads);
  });

  // Admin: Settings
  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(settingsObj);
  });

  app.post("/api/admin/settings", (req, res) => {
    const settings = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    Object.entries(settings).forEach(([key, value]) => {
      upsert.run(key, String(value));
    });
    res.json({ success: true });
  });

  // Admin: Affiliates
  app.get("/api/admin/affiliates", (req, res) => {
    const affiliates = db.prepare("SELECT id, name, email, password, balance, whatsapp, pix, created_at FROM users WHERE role = 'affiliate'").all();
    res.json(affiliates);
  });

  app.put("/api/admin/affiliates/:id", (req, res) => {
    const { name, email, password, whatsapp, pix } = req.body;
    const currentUser = db.prepare("SELECT password FROM users WHERE id = ?").get(req.params.id);
    
    let finalPassword = password;
    if (password && password !== currentUser.password) {
      finalPassword = bcrypt.hashSync(password, 10);
    }

    db.prepare("UPDATE users SET name = ?, email = ?, password = ?, whatsapp = ?, pix = ? WHERE id = ?").run(name, email, finalPassword, whatsapp, pix, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/affiliates/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Admin: Withdrawals
  app.get("/api/admin/withdrawals", (req, res) => {
    const withdrawals = db.prepare(`
      SELECT w.*, u.name as user_name, u.pix as user_pix 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
      ORDER BY w.created_at DESC
    `).all();
    res.json(withdrawals);
  });

  app.post("/api/admin/withdrawals/:id/approve", (req, res) => {
    const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(req.params.id);
    if (withdrawal && withdrawal.status === 'pending') {
      db.prepare("UPDATE withdrawals SET status = 'approved' WHERE id = ?").run(req.params.id);
      // Deduct from user balance
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(withdrawal.amount, withdrawal.user_id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Saque inválido ou já processado" });
    }
  });

  app.post("/api/admin/withdrawals/:id/reject", (req, res) => {
    db.prepare("UPDATE withdrawals SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Affiliate: Leads
  app.get("/api/affiliate/:id/leads", (req, res) => {
    const leads = db.prepare(`
      SELECT l.*, p.name as product_name 
      FROM leads l 
      JOIN affiliations a ON l.affiliation_id = a.id 
      JOIN products p ON a.product_id = p.id 
      WHERE a.user_id = ? 
      ORDER BY l.created_at DESC
    `).all(req.params.id);
    res.json(leads);
  });

  // Affiliate: Dashboard
  app.get("/api/affiliate/:id/stats", (req, res) => {
    const userId = req.params.id;
    const balance = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId).balance;
    const totalSales = db.prepare(`
      SELECT SUM(s.amount) as total 
      FROM sales s 
      JOIN affiliations a ON s.affiliation_id = a.id 
      WHERE a.user_id = ? AND s.status = 'completed'
    `).get(userId).total || 0;
    
    const totalCommission = db.prepare(`
      SELECT SUM(s.commission) as total 
      FROM sales s 
      JOIN affiliations a ON s.affiliation_id = a.id 
      WHERE a.user_id = ? AND s.status = 'completed'
    `).get(userId).total || 0;

    const totalClicks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM clicks c 
      JOIN affiliations a ON c.affiliation_id = a.id 
      WHERE a.user_id = ?
    `).get(userId).count;

    // Performance Chart Data (Last 7 days)
    const chartData = db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-6 days')
        UNION ALL
        SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
      )
      SELECT 
        d.date,
        (SELECT COUNT(*) FROM clicks c JOIN affiliations a ON c.affiliation_id = a.id WHERE a.user_id = ? AND date(c.created_at) = d.date) as clicks,
        (SELECT COUNT(*) FROM sales s JOIN affiliations a ON s.affiliation_id = a.id WHERE a.user_id = ? AND date(s.created_at) = d.date AND s.status = 'completed') as sales
      FROM dates d
    `).all(userId, userId);

    res.json({ balance, totalSales, totalCommission, totalClicks, chartData });
  });

  // Affiliate: Products
  app.get("/api/affiliate/:id/products", (req, res) => {
    const userId = req.params.id;
    const products = db.prepare(`
      SELECT p.*, a.affiliate_code 
      FROM products p 
      LEFT JOIN affiliations a ON p.id = a.product_id AND a.user_id = ?
      WHERE p.active = 1
    `).all(userId);
    res.json(products);
  });

  app.post("/api/affiliate/:id/affiliate/:productId", (req, res) => {
    const userId = req.params.id;
    const productId = req.params.productId;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      db.prepare("INSERT INTO affiliations (user_id, product_id, affiliate_code) VALUES (?, ?, ?)").run(userId, productId, code);
      res.json({ code });
    } catch (e) {
      res.status(400).json({ error: "Já afiliado ou erro ao gerar código" });
    }
  });

  // Affiliate: Withdrawals
  app.get("/api/affiliate/:id/withdrawals", (req, res) => {
    const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(withdrawals);
  });

  app.post("/api/affiliate/:id/withdrawals", (req, res) => {
    const { amount } = req.body;
    const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(req.params.id);
    
    if (user.balance >= amount) {
      const autoApprove = db.prepare("SELECT value FROM settings WHERE key = 'auto_approve_withdrawals'").get()?.value === 'true';
      
      if (autoApprove) {
        db.transaction(() => {
          const result = db.prepare("INSERT INTO withdrawals (user_id, amount, status) VALUES (?, ?, 'approved')").run(req.params.id, amount);
          db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, req.params.id);
        })();
      } else {
        db.prepare("INSERT INTO withdrawals (user_id, amount) VALUES (?, ?)").run(req.params.id, amount);
      }
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Saldo insuficiente" });
    }
  });

  // Public: Register Affiliate
  app.post("/api/register", (req, res) => {
    const { name, email, password, whatsapp, pix } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (name, email, password, role, whatsapp, pix) VALUES (?, ?, ?, 'affiliate', ?, ?)").run(name, email, hashedPassword, whatsapp, pix);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email já cadastrado" });
    }
  });

  // Public: Track Click & Lead Capture Page
  app.get("/p/:code", (req, res) => {
    const affiliation = db.prepare(`
      SELECT a.id, p.name as product_name, p.image_url 
      FROM affiliations a 
      JOIN products p ON a.product_id = p.id 
      WHERE a.affiliate_code = ?
    `).get(req.params.code);

    if (affiliation) {
      db.prepare("INSERT INTO clicks (affiliation_id) VALUES (?)").run(affiliation.id);
      
      // Return a lead capture page
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Acessar Produto - ${affiliation.product_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
          <style>body { font-family: 'Inter', sans-serif; }</style>
        </head>
        <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 w-full max-w-md">
            <div class="text-center mb-8">
              ${affiliation.image_url ? `<img src="${affiliation.image_url}" class="w-24 h-24 object-cover rounded-2xl mx-auto mb-4 shadow-md" />` : ''}
              <h1 class="text-2xl font-bold text-slate-900">Quase lá!</h1>
              <p class="text-slate-500 mt-2">Preencha seus dados para acessar o produto <strong>${affiliation.product_name}</strong></p>
            </div>
            
            <form id="leadForm" class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input type="text" name="name" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50" placeholder="Seu nome">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">WhatsApp</label>
                <input type="tel" name="whatsapp" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50" placeholder="(00) 00000-0000">
              </div>
              <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200">
                Acessar Produto Agora
              </button>
            </form>
          </div>

          <script>
            document.getElementById('leadForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                affiliation_id: ${affiliation.id},
                name: formData.get('name'),
                whatsapp: formData.get('whatsapp')
              };

              try {
                const res = await fetch('/api/leads', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.redirect) {
                  window.location.href = result.redirect;
                }
              } catch (err) {
                console.error(err);
                alert('Erro ao processar. Tente novamente.');
              }
            });
          </script>
        </body>
        </html>
      `);
    } else {
      res.status(404).send("Link inválido");
    }
  });

  // Public: Save Lead & Get Redirect
  app.post("/api/leads", (req, res) => {
    const { affiliation_id, name, whatsapp } = req.body;
    db.prepare("INSERT INTO leads (affiliation_id, name, whatsapp) VALUES (?, ?, ?)").run(affiliation_id, name, whatsapp);
    
    const product = db.prepare(`
      SELECT p.purchase_url 
      FROM products p 
      JOIN affiliations a ON a.product_id = p.id 
      WHERE a.id = ?
    `).get(affiliation_id);

    res.json({ redirect: product.purchase_url || "/" });
  });

  // Simulated Sale Endpoint
  app.post("/api/simulate-sale", (req, res) => {
    const { code, amount } = req.body;
    const affiliation = db.prepare(`
      SELECT a.id, p.commission_rate, a.user_id 
      FROM affiliations a 
      JOIN products p ON a.product_id = p.id 
      WHERE a.affiliate_code = ?
    `).get(code);

    if (affiliation) {
      const commission = (amount * affiliation.commission_rate) / 100;
      db.prepare("INSERT INTO sales (affiliation_id, amount, commission, status) VALUES (?, ?, ?, 'completed')").run(
        affiliation.id, amount, commission
      );
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commission, affiliation.user_id);
      res.json({ success: true, commission });
    } else {
      res.status(404).json({ error: "Código inválido" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
