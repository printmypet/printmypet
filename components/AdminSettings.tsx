
import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Settings, Palette, Layers, Box, Circle, Triangle, Cloud, CloudOff, Save, Database, Copy, CheckCircle, AlertTriangle, Loader2, GripVertical, Beaker, ShieldAlert, UserPlus, Users, Lock, ShieldCheck, User, TrendingUp, DollarSign, Package, Truck, Calendar, Edit2, X, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PartsColors, SupabaseConfig, Texture, ColorOption, AppUser, Order } from '../types';
import { Button } from './ui/Button';
import { testConnection, addColorToSupabase, deleteColorFromSupabase, addTextureToSupabase, deleteTextureFromSupabase, updateColorPositions, registerUser, fetchUsers, updateUser, deleteUser } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

interface AdminSettingsProps {
  partsColors: PartsColors;
  textures: Texture[];
  onUpdatePartsColors: (colors: PartsColors) => void;
  onUpdateTextures: (textures: Texture[]) => void;
  onConfigUpdate: () => void;
  onRefreshColors?: () => void;
  isOnline: boolean;
  currentUser: AppUser | null;
  orders?: Order[]; // Adicionado para relatórios
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  partsColors, 
  textures, 
  onUpdatePartsColors, 
  onUpdateTextures,
  onConfigUpdate,
  onRefreshColors,
  isOnline,
  currentUser,
  orders = []
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'cloud' | 'testing' | 'users' | 'reports'>(() => {
    return localStorage.getItem('app-supabase-config') ? 'products' : 'cloud';
  });
  
  const [activePart, setActivePart] = useState<keyof PartsColors>('base');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newTextureName, setNewTextureName] = useState('');
  const [isProcessingColor, setIsProcessingColor] = useState(false);
  const [isProcessingTexture, setIsProcessingTexture] = useState(false);
  
  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Prod Config
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseKey: ''
  });

  // Test Config
  const [testConfig, setTestConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseKey: ''
  });

  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [currentEnv, setCurrentEnv] = useState<'prod' | 'test'>('prod');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message?: string} | null>(null);

  // User Management State
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [userMsg, setUserMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    // If user is not admin and tries to access restricted tabs, switch to products
    if (!isAdmin && (activeTab === 'cloud' || activeTab === 'testing' || activeTab === 'users' || activeTab === 'reports')) {
       setActiveTab('products');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    // Load Prod Config
    const savedConfig = localStorage.getItem('app-supabase-config');
    if (savedConfig) {
      setSupabaseConfig(JSON.parse(savedConfig));
      setIsCloudConfigured(true);
    }

    // Load Test Config
    const savedTestConfig = localStorage.getItem('app-supabase-config-test');
    if (savedTestConfig) {
      setTestConfig(JSON.parse(savedTestConfig));
    }

    // Load Current Env
    const env = localStorage.getItem('app-env-mode') as 'prod' | 'test';
    if (env) setCurrentEnv(env);
  }, []);

  // Fetch Users when tab is active
  useEffect(() => {
     if (activeTab === 'users' && isOnline) {
       loadUsers();
     }
  }, [activeTab, isOnline]);

  const loadUsers = async () => {
     setIsLoadingUsers(true);
     const users = await fetchUsers();
     setUsersList(users);
     setIsLoadingUsers(false);
  };

  // --- Financial Reports Logic ---
  const financialData = useMemo(() => {
    const data = {
        totalPaid: 0,
        totalPending: 0,
        paidShipping: 0,
        paidProducts: 0,
        pendingShipping: 0,
        pendingProducts: 0,
        totalOrders: orders.length,
        paidOrdersCount: 0,
    };

    orders.forEach(order => {
        const total = order.price || 0;
        const shipping = order.shippingCost || 0;
        const products = Math.max(0, total - shipping);

        if (order.isPaid) {
            data.totalPaid += total;
            data.paidShipping += shipping;
            data.paidProducts += products;
            data.paidOrdersCount += 1;
        } else {
            data.totalPending += total;
            data.pendingShipping += shipping;
            data.pendingProducts += products;
        }
    });
    return data;
  }, [orders]);

  const chartDataStatus = [
    { name: 'Pago', valor: financialData.totalPaid },
    { name: 'Pendente', valor: financialData.totalPending },
  ];

  const chartDataComposition = [
    { name: 'Produtos (Pago)', value: financialData.paidProducts },
    { name: 'Frete (Pago)', value: financialData.paidShipping },
    { name: 'Produtos (Pendente)', value: financialData.pendingProducts },
    { name: 'Frete (Pendente)', value: financialData.pendingShipping },
  ].filter(i => i.value > 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- Handlers ---

  const handleSaveCloudConfig = async (e: React.FormEvent, type: 'prod' | 'test') => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const configToTest = type === 'prod' ? supabaseConfig : testConfig;

    if (!configToTest.supabaseUrl || !configToTest.supabaseKey) {
       setIsTesting(false);
       setTestResult({ success: false, message: 'Preencha ambos os campos.' });
       return;
    }

    const result = await testConnection(configToTest);
    
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      const cleanConfig = {
        supabaseUrl: configToTest.supabaseUrl.trim(),
        supabaseKey: configToTest.supabaseKey.trim()
      };
      
      if (type === 'prod') {
        localStorage.setItem('app-supabase-config', JSON.stringify(cleanConfig));
        setIsCloudConfigured(true);
      } else {
        localStorage.setItem('app-supabase-config-test', JSON.stringify(cleanConfig));
        alert("Configuração de testes salva com sucesso!");
      }
      
      // If we are currently in the environment we just updated, refresh
      if (currentEnv === type) {
        onConfigUpdate();
      }
    }
  };

  const handleSwitchEnv = (targetEnv: 'prod' | 'test') => {
    if (targetEnv === 'test') {
       const hasTestConfig = localStorage.getItem('app-supabase-config-test');
       if (!hasTestConfig) {
         alert("Configure primeiro o banco de dados de testes na aba 'Área de Testes'.");
         return;
       }
    }
    
    if (confirm(`Deseja mudar para o ambiente de ${targetEnv === 'prod' ? 'PRODUÇÃO' : 'TESTES'}? A página será recarregada.`)) {
      localStorage.setItem('app-env-mode', targetEnv);
      window.location.reload();
    }
  };

  const handleClearCloudConfig = () => {
    if (confirm('Isso desconectará o app da nuvem. Os pedidos voltarão a ser salvos apenas neste dispositivo. Continuar?')) {
      localStorage.removeItem('app-supabase-config');
      localStorage.removeItem('app-supabase-config-test');
      localStorage.removeItem('app-env-mode');
      setIsCloudConfigured(false);
      setSupabaseConfig({ supabaseUrl: '', supabaseKey: '' });
      setTestConfig({ supabaseUrl: '', supabaseKey: '' });
      onConfigUpdate();
    }
  };

  const resetUserForm = () => {
      setNewUserName('');
      setNewUserLogin('');
      setNewUserPass('');
      setNewUserIsAdmin(false);
      setEditingUserId(null);
      setUserMsg(null);
  };

  const handleEditUser = (user: AppUser) => {
      setEditingUserId(user.id);
      setNewUserName(user.name);
      setNewUserLogin(user.username);
      setNewUserPass(user.password || ''); 
      setNewUserIsAdmin(user.role === 'admin');
      setUserMsg(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
      await deleteUser(id);
      loadUsers();
  };

  const handleRegisterOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);
    setIsRegistering(true);

    if (!newUserName || !newUserLogin || !newUserPass) {
        setUserMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
        setIsRegistering(false);
        return;
    }

    let result;
    if (editingUserId) {
        result = await updateUser({
            id: editingUserId,
            name: newUserName,
            username: newUserLogin,
            password: newUserPass,
            role: newUserIsAdmin ? 'admin' : 'user'
        });
    } else {
        result = await registerUser({
            name: newUserName,
            username: newUserLogin,
            password: newUserPass,
            role: newUserIsAdmin ? 'admin' : 'user'
        });
    }

    if (result.success) {
        setUserMsg({ type: 'success', text: editingUserId ? 'Usuário atualizado!' : 'Usuário cadastrado!' });
        resetUserForm();
        loadUsers();
    } else {
        setUserMsg({ type: 'error', text: result.message || 'Erro ao salvar.' });
    }
    setIsRegistering(false);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    const newList = [...partsColors[activePart]];
    const [movedItem] = newList.splice(draggedItemIndex, 1);
    newList.splice(dropIndex, 0, movedItem);
    onUpdatePartsColors({ ...partsColors, [activePart]: newList });
    setDraggedItemIndex(null);
    if (isOnline) {
       try { await updateColorPositions(newList); } catch (err) { console.error("Failed to update positions in DB", err); }
    }
  };

  const handleAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newColorName && newColorHex) {
      setIsProcessingColor(true);
      try {
        if (isOnline) {
          await addColorToSupabase(activePart, newColorName, newColorHex);
          if (onRefreshColors) await onRefreshColors();
        } else {
          const updatedList = [...partsColors[activePart], { name: newColorName, hex: newColorHex }];
          onUpdatePartsColors({ ...partsColors, [activePart]: updatedList });
        }
        setNewColorName('');
        setNewColorHex('#000000');
      } catch (e) {
        alert("Erro ao adicionar cor.");
      } finally {
        setIsProcessingColor(false);
      }
    }
  };

  const handleDeleteColor = async (color: any) => {
    if (confirm('Tem certeza que deseja remover esta cor?')) {
      try {
        if (isOnline && color.id) {
           await deleteColorFromSupabase(color.id);
           if (onRefreshColors) await onRefreshColors();
        } else {
           const updatedList = partsColors[activePart].filter(c => c.hex !== color.hex);
           onUpdatePartsColors({ ...partsColors, [activePart]: updatedList });
        }
      } catch (e) { alert("Erro ao remover cor."); }
    }
  };

  const handleAddTexture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTextureName) {
      const exists = textures.some(t => t.name.toLowerCase() === newTextureName.toLowerCase());
      if (exists) { alert('Esta textura já existe!'); return; }
      setIsProcessingTexture(true);
      try {
        if (isOnline) {
          await addTextureToSupabase(newTextureName);
          if (onRefreshColors) await onRefreshColors();
        } else {
          onUpdateTextures([...textures, { id: uuidv4(), name: newTextureName }]);
        }
        setNewTextureName('');
      } catch (e) { alert("Erro ao adicionar textura."); } finally { setIsProcessingTexture(false); }
    }
  };

  const handleDeleteTexture = async (texture: Texture) => {
    if (confirm('Tem certeza que deseja remover esta textura?')) {
      try {
        if (isOnline && texture.id) {
           await deleteTextureFromSupabase(texture.id);
           if (onRefreshColors) await onRefreshColors();
        } else {
           onUpdateTextures(textures.filter(t => t.name !== texture.name));
        }
      } catch (e) { alert("Erro ao remover textura."); }
    }
  };

  const copySql = () => {
    const sqlParts = [
      "-- SCRIPT DE CONFIGURAÇÃO (v8)",
      "CREATE TABLE IF NOT EXISTS public.customers (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL);",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type text DEFAULT 'final';",
      "CREATE UNIQUE INDEX IF NOT EXISTS customers_cpf_unique_idx ON public.customers (cpf) WHERE cpf IS NOT NULL AND cpf != '';",
      "CREATE TABLE IF NOT EXISTS public.colors (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, hex text NOT NULL, part_type text NOT NULL, position integer);",
      "CREATE TABLE IF NOT EXISTS public.textures (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL UNIQUE);",
      "CREATE TABLE IF NOT EXISTS public.orders (id uuid PRIMARY KEY, status text, price numeric, shipping_cost numeric, is_paid boolean, products jsonb, customer jsonb, customer_id uuid REFERENCES public.customers(id));",
      "CREATE TABLE IF NOT EXISTS public.app_users (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, username text NOT NULL UNIQUE, password text NOT NULL, role text DEFAULT 'user');",
      "ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;",
      "ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;"
    ];
    
    navigator.clipboard.writeText(sqlParts.join('\n'));
    alert("SQL Simplificado copiado! Use para setup rápido.");
  };

  const partLabels: Record<keyof PartsColors, string> = { base: 'Base', ball: 'Bola', top: 'Tampa/Topo' };
  const partIcons: Record<keyof PartsColors, React.ReactNode> = { base: <Box className="w-4 h-4" />, ball: <Circle className="w-4 h-4" />, top: <Triangle className="w-4 h-4" /> };

  const COLORS_PIE = ['#4F46E5', '#3B82F6', '#F59E0B', '#FCD34D'];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" />
            Configurações do Sistema
            </h2>
            <p className="text-slate-500 mt-1">
              Ambiente atual: <span className={`font-bold ${currentEnv === 'test' ? 'text-orange-600' : 'text-emerald-600'}`}>
                {currentEnv === 'test' ? 'TESTES (Sandbox)' : 'PRODUÇÃO'}
              </span>
            </p>
        </div>
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('products')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
                Produtos
            </button>
            {isAdmin && (
             <>
               <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'reports' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
               >
                  Relatórios
              </button>
               <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
               >
                  Usuários
              </button>
               <button
                  onClick={() => setActiveTab('cloud')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'cloud' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
               >
                  Nuvem (Prod)
              </button>
              <button
                  onClick={() => setActiveTab('testing')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'testing' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
              >
                  Área de Testes
              </button>
             </>
            )}
        </div>
      </div>

      {!isAdmin && (activeTab === 'cloud' || activeTab === 'testing' || activeTab === 'users' || activeTab === 'reports') && (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg text-red-700">
           <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-50" />
           <h3 className="font-bold">Acesso Negado</h3>
           <p>Você não tem permissão para acessar esta área.</p>
        </div>
      )}

      {/* --- REPORTS DASHBOARD TAB --- */}
      {isAdmin && activeTab === 'reports' && (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Dashboard Financeiro</h3>
                    <p className="text-sm text-slate-500">Visão geral de faturamento, pendências e custos.</p>
                 </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                           <CheckCircle className="w-4 h-4 text-green-500" /> Total Pago
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(financialData.totalPaid)}</h3>
                        <p className="text-xs text-green-600 mt-1 font-medium">{financialData.paidOrdersCount} pedidos pagos</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4 text-yellow-500" /> A Receber
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(financialData.totalPending)}</h3>
                        <p className="text-xs text-yellow-600 mt-1 font-medium">Pendente de pagamento</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                    <div className="relative z-10">
                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                           <Package className="w-4 h-4 text-indigo-500" /> Prod. Vendidos (Pago)
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(financialData.paidProducts)}</h3>
                        <p className="text-xs text-slate-400 mt-1">Líquido de frete</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                     <div className="relative z-10">
                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                           <Truck className="w-4 h-4 text-blue-500" /> Frete Repassado (Pago)
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(financialData.paidShipping)}</h3>
                        <p className="text-xs text-slate-400 mt-1">Valor destinado a envio</p>
                     </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Status Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Status Financeiro Geral</h4>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataStatus} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tickFormatter={(val) => `R$ ${val}`} 
                                    width={80}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                    {chartDataStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#eab308'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Composition Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Composição dos Valores</h4>
                    <div className="h-72 w-full flex flex-col md:flex-row items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartDataComposition}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartDataComposition.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 text-xs text-slate-600 min-w-[150px]">
                            {chartDataComposition.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS_PIE[index % COLORS_PIE.length] }}></span>
                                    <span>{entry.name}: <strong>{formatCurrency(entry.value)}</strong></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- USER MANAGEMENT TAB --- */}
      {isAdmin && activeTab === 'users' && (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                          <Users className="w-6 h-6" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-900">
                              {editingUserId ? 'Editar Usuário' : 'Gerenciar Usuários'}
                          </h3>
                          <p className="text-sm text-slate-500">
                              {editingUserId ? 'Atualize os dados abaixo.' : 'Cadastre novos usuários para acessar o sistema.'}
                          </p>
                      </div>
                   </div>
                   {editingUserId && (
                       <Button variant="secondary" size="sm" onClick={resetUserForm}>
                           <X className="w-4 h-4 mr-2" /> Cancelar Edição
                       </Button>
                   )}
                </div>

                <div className="p-8">
                    <form onSubmit={handleRegisterOrUpdateUser} className="max-w-md mx-auto space-y-5">
                         {userMsg && (
                            <div className={`p-3 rounded-lg text-sm border flex items-center gap-2 ${userMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {userMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                {userMsg.text}
                            </div>
                         )}

                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input
                              type="text"
                              required
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              placeholder="Ex: João da Silva"
                            />
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Login (Usuário)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                type="text"
                                required
                                value={newUserLogin}
                                onChange={(e) => setNewUserLogin(e.target.value)}
                                className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                placeholder="joao.silva"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {editingUserId ? 'Nova Senha' : 'Senha'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                type="text"
                                required={!editingUserId}
                                value={newUserPass}
                                onChange={(e) => setNewUserPass(e.target.value)}
                                className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                placeholder={editingUserId ? "Deixe visível para alterar" : "******"}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${newUserIsAdmin ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {newUserIsAdmin && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={newUserIsAdmin}
                                onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                            />
                            <div>
                                <span className="block text-sm font-medium text-slate-900">Perfil de Administrador</span>
                                <span className="block text-xs text-slate-500">Acesso total às configurações e áreas restritas.</span>
                            </div>
                            </label>
                        </div>

                        <Button type="submit" className="w-full" disabled={isRegistering}>
                            {isRegistering ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {editingUserId ? 'Atualizando...' : 'Salvando...'}</>
                            ) : (
                                <>{editingUserId ? <Save className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />} {editingUserId ? 'Atualizar Usuário' : 'Cadastrar Usuário'}</>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Users List */}
                <div className="border-t border-slate-200 p-8 bg-slate-50">
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800">Usuários Cadastrados ({usersList.length})</h4>
                      <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoadingUsers}>
                          <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                      </Button>
                   </div>
                   
                   <div className="space-y-3">
                      {usersList.length === 0 && !isLoadingUsers && (
                          <p className="text-center text-slate-500 text-sm py-4">Nenhum usuário encontrado.</p>
                      )}
                      
                      {usersList.map(user => (
                          <div key={user.id} className={`bg-white p-4 rounded-lg border flex items-center justify-between shadow-sm transition-colors ${editingUserId === user.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                      {user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-900">{user.name} {user.id === currentUser?.id && <span className="text-xs text-slate-400 font-normal">(Você)</span>}</p>
                                      <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button 
                                      onClick={() => handleEditUser(user)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Editar"
                                  >
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  {user.id !== currentUser?.id && (
                                      <button 
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Excluir"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>
      )}

      {isAdmin && activeTab === 'testing' && (
         <div className="max-w-4xl mx-auto space-y-6">
           <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-6">
                 <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <Beaker className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-orange-900">Configuração do Ambiente de Testes</h3>
                    <p className="text-sm text-orange-700 mt-1">
                       Configure um projeto secundário do Supabase para testar novas funcionalidades sem afetar os dados reais.
                    </p>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                 <form onSubmit={(e) => handleSaveCloudConfig(e, 'test')} className="space-y-4 flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project URL (Testes)</label>
                        <input 
                            type="text" 
                            value={testConfig.supabaseUrl}
                            onChange={(e) => setTestConfig({...testConfig, supabaseUrl: e.target.value})}
                            className="w-full rounded-md border-orange-200 shadow-sm p-2 border focus:ring-orange-500 focus:border-orange-500"
                            placeholder="https://test-project.supabase.co"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key (Testes)</label>
                        <input 
                            type="password" 
                            value={testConfig.supabaseKey}
                            onChange={(e) => setTestConfig({...testConfig, supabaseKey: e.target.value})}
                            className="w-full rounded-md border-orange-200 shadow-sm p-2 border focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Key do projeto de testes..."
                        />
                    </div>
                    <Button type="submit" disabled={isTesting} className="bg-orange-600 hover:bg-orange-700 text-white w-full">
                         {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                         Salvar Configuração de Testes
                    </Button>
                 </form>

                 <div className="flex-1 bg-white p-4 rounded-lg border border-orange-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Alternar Ambiente</h4>
                      <p className="text-sm text-slate-500 mb-4">
                        O ambiente atual é: <strong>{currentEnv === 'prod' ? 'PRODUÇÃO' : 'TESTES'}</strong>.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleSwitchEnv('test')}
                        disabled={currentEnv === 'test'}
                        className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${currentEnv === 'test' ? 'bg-orange-100 border-orange-300 text-orange-800 opacity-50 cursor-default' : 'bg-white hover:bg-orange-50 border-slate-200 text-slate-700'}`}
                      >
                         <div className={`w-4 h-4 rounded-full border ${currentEnv === 'test' ? 'bg-orange-500 border-orange-600' : 'bg-white border-slate-300'}`}></div>
                         <div className="flex-1">
                           <span className="block font-medium">Ambiente de Testes</span>
                           <span className="text-xs text-slate-400">Dados fictícios e experimentos</span>
                         </div>
                      </button>

                      <button 
                         onClick={() => handleSwitchEnv('prod')}
                         disabled={currentEnv === 'prod'}
                         className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${currentEnv === 'prod' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 opacity-50 cursor-default' : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-700'}`}
                      >
                         <div className={`w-4 h-4 rounded-full border ${currentEnv === 'prod' ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-slate-300'}`}></div>
                         <div className="flex-1">
                           <span className="block font-medium">Ambiente de Produção</span>
                           <span className="text-xs text-slate-400">Dados reais dos clientes</span>
                         </div>
                      </button>
                    </div>
                 </div>
              </div>

               {/* SQL Helper for Tests */}
               <div className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-sm flex flex-col mt-6">
                  <div className="flex items-center gap-2 mb-4 text-orange-400">
                      <Database className="w-5 h-5" />
                      <h3 className="font-bold">Setup do Banco de Testes</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                      Crie um projeto novo no Supabase e rode o mesmo SQL de produção para garantir que o ambiente de testes seja idêntico.
                  </p>
                  <Button variant="secondary" onClick={copySql} className="self-start text-xs">
                    <Copy className="w-3 h-3 mr-2" /> Copiar SQL de Setup
                  </Button>
              </div>
           </div>
         </div>
      )}

      {isAdmin && activeTab === 'cloud' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-xl border ${isCloudConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center gap-3 mb-6">
                    {isCloudConfigured ? (
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <Cloud className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                            <CloudOff className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {isCloudConfigured ? 'Conectado (Produção)' : 'Conexão de Produção'}
                        </h3>
                        <p className="text-sm text-slate-500">
                            Configuração oficial onde os pedidos reais são salvos.
                        </p>
                    </div>
                </div>

                <form onSubmit={(e) => handleSaveCloudConfig(e, 'prod')} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            value={supabaseConfig.supabaseUrl}
                            onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseUrl: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            placeholder="https://xyz.supabase.co"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key (public/anon)</label>
                        <input 
                            type="password" 
                            value={supabaseConfig.supabaseKey}
                            onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseKey: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            placeholder="eyJxh..."
                            required
                        />
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg text-sm border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} flex items-start gap-2`}>
                        {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                        <div>
                          <strong>{testResult.success ? 'Conexão bem sucedida!' : 'Falha na conexão:'}</strong>
                          <p>{testResult.message || (testResult.success ? 'Conectado! Verifique o topo da página.' : '')}</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-emerald-100/50 flex justify-end gap-3">
                         {isCloudConfigured && (
                            <Button type="button" variant="danger" onClick={handleClearCloudConfig}>
                                Resetar Tudo
                            </Button>
                         )}
                         <Button type="submit" disabled={isTesting}>
                            {isTesting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Testando...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Produção
                              </>
                            )}
                         </Button>
                    </div>
                </form>
            </div>

            <div className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <Database className="w-5 h-5" />
                    <h3 className="font-bold">Setup do Banco de Dados</h3>
                </div>
                
                <p className="text-sm text-slate-400 mb-4">
                    Copie o SQL abaixo e rode no Supabase para criar ou atualizar as tabelas.
                </p>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 font-mono text-xs overflow-x-auto relative group flex-1">
                    <pre className="text-emerald-300">
{`-- SCRIPT DE CONFIGURAÇÃO (v8)
-- (Clique no botão copiar para ver tudo)
CREATE TABLE IF NOT EXISTS public.customers (...);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid boolean;
ALTER TABLE public.colors ADD COLUMN IF NOT EXISTS position integer;
-- (+ Migrações automáticas de colunas)`}
                    </pre>
                    <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copiar SQL Completo"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="mt-4 text-xs text-slate-500">
                   * Este script é seguro para rodar várias vezes.
                </div>
            </div>
        </div>
      )}

      {activeTab === 'products' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Catálogo de Cores
            </h3>
            {isOnline && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">Salvo na Nuvem</span>}
          </div>

          <div className="border-b border-slate-200 px-4 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(Object.keys(partsColors) as Array<keyof PartsColors>).map((part) => (
                <button
                  key={part}
                  onClick={() => setActivePart(part)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    activePart === part
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {partIcons[part]}
                  {partLabels[part]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 text-sm text-indigo-800 mb-4 flex justify-between items-center">
              <span>Editando cores para: <strong>{partLabels[activePart]}</strong></span>
              <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded">Arraste para reordenar</span>
            </div>

            <form onSubmit={handleAddColor} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Cor</label>
                <input 
                  type="text" 
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder={`Cor para ${partLabels[activePart]}...`}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cor</label>
                <input 
                  type="color" 
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="h-10 w-20 p-1 rounded-md border border-slate-300 cursor-pointer bg-white"
                />
              </div>
              <Button type="submit" size="md" disabled={isProcessingColor}>
                {isProcessingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} 
                Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cores Cadastradas - {partLabels[activePart]} ({partsColors[activePart].length})
              </label>
              {partsColors[activePart].map((color, index) => (
                <div 
                  key={color.hex + color.name} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center justify-between p-3 bg-white border rounded-lg transition-all shadow-sm ${draggedItemIndex === index ? 'opacity-50 border-dashed border-indigo-400' : 'border-slate-100 hover:border-indigo-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 p-1">
                       <GripVertical className="w-4 h-4" />
                    </div>
                    <div 
                      className="w-8 h-8 rounded-full border border-slate-200 shadow-inner" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <span className="block font-medium text-slate-900">{color.name}</span>
                      <span className="block text-xs text-slate-400 font-mono">{color.hex}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteColor(color)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-2"
                    title="Remover cor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {partsColors[activePart].length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma cor cadastrada para esta parte.</p>
              )}
            </div>
          </div>
        </div>

        {/* Texture Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Catálogo de Texturas
            </h3>
            {isOnline && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">Salvo na Nuvem</span>}
          </div>
          
          <div className="p-6 space-y-6">
            <form onSubmit={handleAddTexture} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Textura</label>
                <input 
                  type="text" 
                  value={newTextureName}
                  onChange={(e) => setNewTextureName(e.target.value)}
                  placeholder="Ex: Fibra de Carbono"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                  required
                />
              </div>
              <Button type="submit" size="md" disabled={isProcessingTexture}>
                 {isProcessingTexture ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} 
                 Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Texturas Cadastradas ({textures.length})</label>
              {textures.map((texture) => (
                <div key={texture.name} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="block font-medium text-slate-900">{texture.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTexture(texture)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-2"
                    title="Remover textura"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
