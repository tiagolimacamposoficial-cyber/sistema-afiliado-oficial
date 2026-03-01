import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  DollarSign, 
  LogOut, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ExternalLink, 
  TrendingUp, 
  MousePointer2, 
  Wallet,
  Settings,
  Key,
  ChevronRight,
  Menu
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, User, Product, Affiliate, Withdrawal, AffiliateStats } from './types';

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-6", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-50'
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50"
      {...props}
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'products' | 'affiliates' | 'withdrawals' | 'settings' | 'leads'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pix, setPix] = useState('');

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, view]);

  const fetchData = async () => {
    if (!user) return;

    if (user.role === 'admin') {
      const [s, p, a, w, l, st] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/products').then(r => r.json()),
        fetch('/api/admin/affiliates').then(r => r.json()),
        fetch('/api/admin/withdrawals').then(r => r.json()),
        fetch('/api/admin/leads').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json())
      ]);
      setStats(s);
      setProducts(p);
      setAffiliates(a);
      setWithdrawals(w);
      setLeads(l);
      setSystemSettings(st);
    } else {
      const [s, p, w, l] = await Promise.all([
        fetch(`/api/affiliate/${user.id}/stats`).then(r => r.json()),
        fetch(`/api/affiliate/${user.id}/products`).then(r => r.json()),
        fetch(`/api/affiliate/${user.id}/withdrawals`).then(r => r.json()),
        fetch(`/api/affiliate/${user.id}/leads`).then(r => r.json())
      ]);
      setAffiliateStats(s);
      setProducts(p);
      setWithdrawals(w);
      setLeads(l);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const u = await res.json();
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
      setView('dashboard');
    } else {
      alert('Credenciais inválidas');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, whatsapp, pix })
    });
    if (res.ok) {
      alert('Cadastro realizado! Faça login.');
      setView('login');
    } else {
      alert('Erro ao cadastrar');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setView('login');
  };

  // --- Admin Actions ---
  const addProduct = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchData();
    e.target.reset();
  };

  const deleteProduct = async (id: number) => {
    if (confirm('Excluir produto?')) {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const updateAffiliate = async (id: number, data: any) => {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchData();
  };

  const deleteAffiliate = async (id: number) => {
    if (confirm('Excluir afiliado?')) {
      await fetch(`/api/admin/affiliates/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const approveWithdrawal = async (id: number) => {
    await fetch(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
    fetchData();
  };

  const rejectWithdrawal = async (id: number) => {
    await fetch(`/api/admin/withdrawals/${id}/reject`, { method: 'POST' });
    fetchData();
  };

  // --- Affiliate Actions ---
  const becomeAffiliate = async (productId: number) => {
    await fetch(`/api/affiliate/${user?.id}/affiliate/${productId}`, { method: 'POST' });
    fetchData();
  };

  const requestWithdrawal = async (e: any) => {
    e.preventDefault();
    const amount = e.target.amount.value;
    const res = await fetch(`/api/affiliate/${user?.id}/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) })
    });
    if (res.ok) {
      fetchData();
      e.target.reset();
    } else {
      alert('Saldo insuficiente');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <TrendingUp className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AffiliMaster</h1>
            <p className="text-slate-500">
              {view === 'login' ? 'Entre na sua conta' : 'Crie sua conta de afiliado'}
            </p>
          </div>

          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {view === 'register' && (
              <>
                <Input 
                  label="Nome Completo" 
                  placeholder="Seu nome" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <Input 
                  label="WhatsApp" 
                  placeholder="(00) 00000-0000" 
                  required 
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
                <Input 
                  label="Chave PIX" 
                  placeholder="CPF, E-mail, Telefone ou Aleatória" 
                  required 
                  value={pix}
                  onChange={e => setPix(e.target.value)}
                />
              </>
            )}
            <Input 
              label="E-mail" 
              type="email" 
              placeholder="seu@email.com" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input 
              label="Senha" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            
            <Button type="submit" className="w-full py-3">
              {view === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <button 
              onClick={() => setView(view === 'login' ? 'register' : 'login')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>

            {view === 'login' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Acesso Administrativo</p>
                <p className="text-xs text-slate-600 font-mono">tiagolimacamposoficial@gmail.com / tiagolima123</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform lg:relative lg:translate-x-0",
        !sidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">AffiliMaster</span>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')} 
            />
            <NavItem 
              icon={<Package size={20} />} 
              label="Produtos" 
              active={view === 'products'} 
              onClick={() => setView('products')} 
            />
            {user.role === 'admin' && (
              <NavItem 
                icon={<Users size={20} />} 
                label="Afiliados" 
                active={view === 'affiliates'} 
                onClick={() => setView('affiliates')} 
              />
            )}
            <NavItem 
              icon={<Wallet size={20} />} 
              label="Saques" 
              active={view === 'withdrawals'} 
              onClick={() => setView('withdrawals')} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Indicações" 
              active={view === 'leads'} 
              onClick={() => setView('leads')} 
            />
            <NavItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={view === 'settings'} 
              onClick={() => setView('settings')} 
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
            >
              <LogOut size={20} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900">Olá, {user.name.split(' ')[0]}! 👋</h2>
                  <p className="text-slate-500">Bem-vindo ao seu painel de {user.role === 'admin' ? 'administração' : 'afiliado'}.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {user.role === 'admin' ? (
                    <>
                      <StatCard icon={<DollarSign />} label="Vendas Totais" value={`R$ ${stats?.totalSales?.toFixed(2) || '0.00'}`} color="indigo" />
                      <StatCard icon={<TrendingUp />} label="Comissões Pagas" value={`R$ ${stats?.totalCommission?.toFixed(2) || '0.00'}`} color="emerald" />
                      <StatCard icon={<Users />} label="Afiliados" value={stats?.totalAffiliates || 0} color="blue" />
                      <StatCard icon={<Wallet />} label="Saques Pendentes" value={`R$ ${stats?.pendingWithdrawals?.toFixed(2) || '0.00'}`} color="amber" />
                    </>
                  ) : (
                    <>
                      <StatCard icon={<Wallet />} label="Saldo Disponível" value={`R$ ${affiliateStats?.balance?.toFixed(2) || '0.00'}`} color="indigo" />
                      <StatCard icon={<DollarSign />} label="Vendas Realizadas" value={`R$ ${affiliateStats?.totalSales?.toFixed(2) || '0.00'}`} color="emerald" />
                      <StatCard icon={<TrendingUp />} label="Comissão Total" value={`R$ ${affiliateStats?.totalCommission?.toFixed(2) || '0.00'}`} color="blue" />
                      <StatCard icon={<MousePointer2 />} label="Cliques Totais" value={affiliateStats?.totalClicks || 0} color="amber" />
                    </>
                  )}
                </div>

                {user.role === 'affiliate' && affiliateStats && (
                  <Card className="h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900">Desempenho (Últimos 7 dias)</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-500" />
                          <span className="text-xs font-medium text-slate-500">Cliques</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-xs font-medium text-slate-500">Vendas</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={affiliateStats.chartData}>
                        <defs>
                          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#94a3b8' }}
                          tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </motion.div>
            )}

            {view === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Produtos</h2>
                  {user.role === 'admin' && (
                    <Button onClick={() => (document.getElementById('add-product-modal') as any).showModal()}>
                      <Plus size={20} />
                      Novo Produto
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <Card key={product.id} className="overflow-hidden p-0 flex flex-col">
                      <div className="h-48 bg-slate-100 relative">
                        <img 
                          src={product.image_url || `https://picsum.photos/seed/${product.id}/400/300`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-indigo-600">
                          {product.commission_rate}% Comis.
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{product.name}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-bold text-slate-900">R$ {product.price.toFixed(2)}</span>
                            <div className="flex items-center gap-2">
                              {user.role === 'admin' && (
                                <button 
                                  onClick={async () => {
                                    const code = prompt('Insira o código de afiliado para simular a venda:');
                                    if (code) {
                                      await fetch('/api/simulate-sale', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ code, amount: product.price })
                                      });
                                      alert('Venda simulada com sucesso!');
                                      fetchData();
                                    }
                                  }}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Simular Venda"
                                >
                                  <DollarSign size={20} />
                                </button>
                              )}
                              {user.role === 'admin' && systemSettings?.allow_deletion === 'true' && (
                                <button 
                                  onClick={() => deleteProduct(product.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir Produto"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {user.role === 'affiliate' && (
                            (product as any).affiliate_code ? (
                              <div className="space-y-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 break-all text-xs font-mono text-slate-600">
                                  {`${window.location.origin}/p/${(product as any).affiliate_code}`}
                                </div>
                                <Button 
                                  className="w-full" 
                                  variant="secondary"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/p/${(product as any).affiliate_code}`);
                                    alert('Link copiado!');
                                  }}
                                >
                                  Copiar Link
                                </Button>
                              </div>
                            ) : (
                              <Button className="w-full" onClick={() => becomeAffiliate(product.id)}>
                                Afiliar-se agora
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <dialog id="add-product-modal" className="modal p-0 bg-transparent">
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Cadastrar Produto</h3>
                        <button onClick={() => (document.getElementById('add-product-modal') as any).close()} className="p-2 hover:bg-slate-100 rounded-lg">
                          <X size={20} />
                        </button>
                      </div>
                      <form onSubmit={(e) => { addProduct(e); (document.getElementById('add-product-modal') as any).close(); }} className="space-y-4">
                        <Input name="name" label="Nome do Produto" required />
                        <Input name="description" label="Descrição" required />
                        <div className="grid grid-cols-2 gap-4">
                          <Input name="price" label="Preço (R$)" type="number" step="0.01" required />
                          <Input name="commission_rate" label="Comissão (%)" type="number" required />
                        </div>
                        <Input name="purchase_url" label="Link de Compra (Checkout)" placeholder="https://..." required />
                        <Input name="image_url" label="URL da Imagem" placeholder="https://..." />
                        <Button type="submit" className="w-full py-3 mt-4">Salvar Produto</Button>
                      </form>
                    </Card>
                  </div>
                </dialog>
              </motion.div>
            )}

            {view === 'affiliates' && user.role === 'admin' && (
              <motion.div 
                key="affiliates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Gerenciar Afiliados</h2>
                </div>

                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">E-mail</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">WhatsApp</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">PIX</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Senha</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Saldo</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {affiliates.map(aff => (
                          <tr key={aff.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <input 
                                className="bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-900 w-full"
                                defaultValue={aff.name}
                                onBlur={(e) => updateAffiliate(aff.id, { ...aff, name: e.target.value })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 w-full"
                                defaultValue={aff.email}
                                onBlur={(e) => updateAffiliate(aff.id, { ...aff, email: e.target.value })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 w-full"
                                defaultValue={aff.whatsapp}
                                onBlur={(e) => updateAffiliate(aff.id, { ...aff, whatsapp: e.target.value })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 w-full"
                                defaultValue={aff.pix}
                                onBlur={(e) => updateAffiliate(aff.id, { ...aff, pix: e.target.value })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Key size={14} className="text-slate-400" />
                                <input 
                                  className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 w-full font-mono text-xs"
                                  defaultValue={aff.password}
                                  onBlur={(e) => updateAffiliate(aff.id, { ...aff, password: e.target.value })}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-emerald-600">R$ {aff.balance.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {systemSettings?.allow_deletion === 'true' && (
                                <button 
                                  onClick={() => deleteAffiliate(aff.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {view === 'withdrawals' && (
              <motion.div 
                key="withdrawals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Saques</h2>
                  {user.role === 'affiliate' && (
                    <Button onClick={() => (document.getElementById('request-withdrawal-modal') as any).showModal()}>
                      Solicitar Saque
                    </Button>
                  )}
                </div>

                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {user.role === 'admin' && <th className="px-6 py-4 text-sm font-semibold text-slate-600">Afiliado</th>}
                          {user.role === 'admin' && <th className="px-6 py-4 text-sm font-semibold text-slate-600">PIX</th>}
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Valor</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Data</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                          {user.role === 'admin' && <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map(w => (
                          <tr key={w.id} className="border-b border-slate-100">
                            {user.role === 'admin' && <td className="px-6 py-4 font-medium">{w.user_name}</td>}
                            {user.role === 'admin' && <td className="px-6 py-4 text-sm text-slate-600 font-mono">{w.user_pix}</td>}
                            <td className="px-6 py-4 font-bold">R$ {w.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {new Date(w.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-bold",
                                w.status === 'pending' && "bg-amber-50 text-amber-600",
                                w.status === 'approved' && "bg-emerald-50 text-emerald-600",
                                w.status === 'rejected' && "bg-rose-50 text-rose-600"
                              )}>
                                {w.status === 'pending' ? 'Pendente' : w.status === 'approved' ? 'Aprovado' : 'Recusado'}
                              </span>
                            </td>
                            {user.role === 'admin' && (
                              <td className="px-6 py-4 text-right">
                                {w.status === 'pending' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => approveWithdrawal(w.id)}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Aprovar"
                                    >
                                      <Check size={18} />
                                    </button>
                                    <button 
                                      onClick={() => rejectWithdrawal(w.id)}
                                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Recusar"
                                    >
                                      <X size={18} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <dialog id="request-withdrawal-modal" className="modal p-0 bg-transparent">
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Solicitar Saque</h3>
                        <button onClick={() => (document.getElementById('request-withdrawal-modal') as any).close()} className="p-2 hover:bg-slate-100 rounded-lg">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-sm text-indigo-600 font-medium">Saldo Disponível</p>
                        <p className="text-2xl font-bold text-indigo-700">R$ {affiliateStats?.balance?.toFixed(2) || '0.00'}</p>
                        {user?.pix && (
                          <div className="mt-2 pt-2 border-t border-indigo-100">
                            <p className="text-xs text-indigo-500 uppercase font-bold tracking-wider">Chave PIX para Recebimento</p>
                            <p className="text-sm font-medium text-indigo-700">{user.pix}</p>
                          </div>
                        )}
                      </div>
                      <form onSubmit={(e) => { requestWithdrawal(e); (document.getElementById('request-withdrawal-modal') as any).close(); }} className="space-y-4">
                        <Input name="amount" label="Valor do Saque (R$)" type="number" step="0.01" required max={affiliateStats?.balance} />
                        <Button type="submit" className="w-full py-3 mt-4">Confirmar Solicitação</Button>
                      </form>
                    </Card>
                  </div>
                </dialog>
              </motion.div>
            )}

            {view === 'leads' && (
              <motion.div 
                key="leads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Novas Indicações (Leads)</h2>
                </div>

                <Card className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">WhatsApp</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Produto</th>
                          {user.role === 'admin' && <th className="px-6 py-4 text-sm font-semibold text-slate-600">Afiliado</th>}
                          <th className="px-6 py-4 text-sm font-semibold text-slate-600">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map(lead => (
                          <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{lead.name}</td>
                            <td className="px-6 py-4">
                              <a 
                                href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                {lead.whatsapp}
                                <ExternalLink size={14} />
                              </a>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{lead.product_name}</td>
                            {user.role === 'admin' && <td className="px-6 py-4 text-slate-600">{lead.affiliate_name}</td>}
                            <td className="px-6 py-4 text-slate-500 text-sm">
                              {new Date(lead.created_at).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                        {leads.length === 0 && (
                          <tr>
                            <td colSpan={user.role === 'admin' ? 5 : 4} className="px-6 py-12 text-center text-slate-500">
                              Nenhuma indicação encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl space-y-8"
              >
                <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
                
                <Card>
                  <h3 className="text-lg font-bold mb-6">Segurança</h3>
                  <div className="space-y-4">
                    <Input label="E-mail" value={user.email} disabled />
                    <Button variant="secondary" className="w-full" onClick={() => alert('Funcionalidade em desenvolvimento')}>
                      <Key size={18} />
                      Redefinir Senha
                    </Button>
                  </div>
                </Card>

                {user.role === 'affiliate' && (
                  <Card>
                    <h3 className="text-lg font-bold mb-6">Dados de Recebimento</h3>
                    <form onSubmit={async (e: any) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const data = Object.fromEntries(formData);
                      const res = await fetch(`/api/admin/affiliates/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...user, ...data })
                      });
                      if (res.ok) {
                        const newUser = { ...user, ...data };
                        setUser(newUser as any);
                        localStorage.setItem('user', JSON.stringify(newUser));
                        alert('Dados atualizados!');
                      }
                    }} className="space-y-4">
                      <Input name="whatsapp" label="WhatsApp" defaultValue={user.whatsapp} required />
                      <Input name="pix" label="Chave PIX" defaultValue={user.pix} required />
                      <Button type="submit" className="w-full py-3 mt-4">Atualizar Perfil</Button>
                    </form>
                  </Card>
                )}

                {user.role === 'admin' && systemSettings && (
                  <Card>
                    <h3 className="text-lg font-bold mb-6">Configurações do Sistema</h3>
                    <form onSubmit={async (e: any) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const data = Object.fromEntries(formData);
                      if (!data.allow_deletion) data.allow_deletion = 'false';
                      if (!data.auto_approve_withdrawals) data.auto_approve_withdrawals = 'false';
                      await fetch('/api/admin/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                      });
                      alert('Configurações salvas!');
                      fetchData();
                    }} className="space-y-4">
                      <Input name="system_name" label="Nome do Sistema" defaultValue={systemSettings.system_name} />
                      <Input name="min_withdrawal" label="Saque Mínimo (R$)" type="number" defaultValue={systemSettings.min_withdrawal} />
                      <Input name="default_commission" label="Comissão Padrão (%)" type="number" defaultValue={systemSettings.default_commission} />
                      <Input name="support_email" label="E-mail de Suporte" type="email" defaultValue={systemSettings.support_email} />
                      
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-900">Permitir Exclusão</p>
                        <p className="text-sm text-slate-500">Habilitar botões de exclusão de produtos e afiliados</p>
                      </div>
                      <input 
                        type="checkbox" 
                        name="allow_deletion" 
                        defaultChecked={systemSettings.allow_deletion === 'true'}
                        value="true"
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-900">Aprovação Automática</p>
                        <p className="text-sm text-slate-500">Aprovar saques automaticamente se houver saldo</p>
                      </div>
                      <input 
                        type="checkbox" 
                        name="auto_approve_withdrawals" 
                        defaultChecked={systemSettings.auto_approve_withdrawals === 'true'}
                        value="true"
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                    </div>

                    <Button type="submit" className="w-full py-3 mt-4">Salvar Alterações</Button>
                    </form>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium",
        active 
          ? "bg-indigo-50 text-indigo-600" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: 'indigo' | 'emerald' | 'blue' | 'amber' }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 shadow-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    amber: "bg-amber-50 text-amber-600 shadow-amber-100"
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", colors[color])}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
    </Card>
  );
}
