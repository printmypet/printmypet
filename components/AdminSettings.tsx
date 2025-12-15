
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Settings, Palette, Layers, Box, Circle, Triangle, Cloud, CloudOff, Save, Database, Copy, CheckCircle, AlertTriangle, Loader2, GripVertical, Beaker, ShieldAlert, UserPlus, Users, Lock, ShieldCheck, User, TrendingUp, DollarSign, Package, Truck, Calendar, Edit2, X, RefreshCw, Disc, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PartsColors, SupabaseConfig, Texture, ColorOption, AppUser, Order, Filament, FilamentType, FilamentRating } from '../types';
import { Button } from './ui/Button';
import { testConnection, addColorToSupabase, deleteColorFromSupabase, addTextureToSupabase, deleteTextureFromSupabase, updateColorPositions, registerUser, fetchUsers, updateUser, deleteUser, fetchFilaments, addFilamentToSupabase, deleteFilamentFromSupabase, updateFilamentQuantity } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { CatalogManager } from './CatalogManager';

interface AdminSettingsProps {
  partsColors: PartsColors;
  textures: Texture[];
  onUpdatePartsColors: (colors: PartsColors) => void;
  onUpdateTextures: (textures: Texture[]) => void;
  onConfigUpdate: () => void;
  onRefreshColors?: () => void;
  isOnline: boolean;
  currentUser: AppUser | null;
  orders?: Order[];
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
  const [activeTab, setActiveTab] = useState<'products' | 'catalog' | 'filaments' | 'cloud' | 'testing' | 'users' | 'reports'>(() => {
    return localStorage.getItem('app-supabase-config') ? 'products' : 'cloud';
  });
  
  const [activePart, setActivePart] = useState<keyof PartsColors>('base');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newTextureName, setNewTextureName] = useState('');
  const [isProcessingColor, setIsProcessingColor] = useState(false);
  const [isProcessingTexture, setIsProcessingTexture] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  
  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Filament State
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [loadingFilaments, setLoadingFilaments] = useState(false);
  const [newFilament, setNewFilament] = useState<{
     brand: string;
     type: FilamentType;
     customType: string;
     colorName: string;
     colorHex: string;
     rating: FilamentRating;
     quantity: number;
  }>({
     brand: '',
     type: 'PLA',
     customType: '',
     colorName: '',
     colorHex: '#000000',
     rating: 'Bom',
     quantity: 1
  });

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
    if (!isAdmin && (activeTab === 'cloud' || activeTab === 'testing' || activeTab === 'users' || activeTab === 'reports' || activeTab === 'filaments' || activeTab === 'catalog')) {
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

  // Fetch Filaments when tab is active
  useEffect(() => {
     if (activeTab === 'filaments' && isOnline) {
         loadFilaments();
     }
  }, [activeTab, isOnline]);

  const loadUsers = async () => {
     setIsLoadingUsers(true);
     const users = await fetchUsers();
     setUsersList(users);
     setIsLoadingUsers(false);
  };

  const loadFilaments = async () => {
     setLoadingFilaments(true);
     const data = await fetchFilaments();
     setFilaments(data);
     setLoadingFilaments(false);
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

  // --- Filament Handlers ---

  const handleAddFilament = async (e: React.FormEvent) => {
     e.preventDefault();
     if(!newFilament.brand || !newFilament.colorName) return;

     const material = newFilament.type === 'Outros' ? newFilament.customType : newFilament.type;
     
     try {
       await addFilamentToSupabase({
         brand: newFilament.brand,
         material: material,
         colorName: newFilament.colorName,
         colorHex: newFilament.colorHex,
         rating: newFilament.rating,
         quantity: newFilament.quantity
       });
       loadFilaments();
       setNewFilament({ ...newFilament, brand: '', colorName: '', quantity: 1, customType: '' });
     } catch (err) {
       alert("Erro ao salvar filamento.");
     }
  };

  const handleDeleteFilament = async (id: string) => {
      if(confirm("Remover este filamento do estoque?")) {
          await deleteFilamentFromSupabase(id);
          loadFilaments();
      }
  };

  const handleUpdateFilamentQty = async (id: string, current: number, change: number) => {
      const newQty = Math.max(0, current + change);
      await updateFilamentQuantity(id, newQty);
      // Otimista update visual
      setFilaments(prev => prev.map(f => f.id === id ? { ...f, quantity: newQty } : f));
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

  const getSqlScript = () => {
    return [
      "-- SCRIPT COMPLETO (v18 - ADIÇÃO TABELAS CATEGORIAS E BANNERS)",
      
      "-- 1. Tabelas de Clientes",
      "CREATE TABLE IF NOT EXISTS public.customers (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL);",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type text DEFAULT 'final';",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS partner_name text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS instagram text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS zip_code text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_full text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS street text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS number text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS complement text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city text;",
      "ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state text;",
      "CREATE UNIQUE INDEX IF NOT EXISTS customers_cpf_unique_idx ON public.customers (cpf) WHERE cpf IS NOT NULL AND cpf != '';",
      
      "-- 2. Tabela de Cores",
      "CREATE TABLE IF NOT EXISTS public.colors (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, hex text NOT NULL, part_type text NOT NULL, position integer DEFAULT 999);",
      "ALTER TABLE public.colors ADD COLUMN IF NOT EXISTS position integer DEFAULT 999;",

      "-- 3. Tabela de Texturas",
      "CREATE TABLE IF NOT EXISTS public.textures (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL UNIQUE);",
      
      "-- 4. Tabela de Pedidos",
      "CREATE TABLE IF NOT EXISTS public.orders (id uuid PRIMARY KEY, status text, price numeric, shipping_cost numeric, is_paid boolean, products jsonb, customer jsonb, customer_id uuid REFERENCES public.customers(id));",
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();",
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;",
      "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;",
      
      "-- 5. Tabela de Usuários do App (Admin/User)",
      "CREATE TABLE IF NOT EXISTS public.app_users (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, username text NOT NULL UNIQUE, password text NOT NULL, role text DEFAULT 'user');",
      
      "-- 6. Tabela de Estoque de Filamentos",
      "CREATE TABLE IF NOT EXISTS public.filaments (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), brand text NOT NULL, material text NOT NULL, color_name text NOT NULL, color_hex text DEFAULT '#000000', rating text NOT NULL, quantity numeric DEFAULT 0);",

      "-- 7. Tabela de Catálogo de Produtos (Vitrine)",
      "CREATE TABLE IF NOT EXISTS public.catalog_products (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL, description text, price numeric NOT NULL, image_url text, category text DEFAULT 'Geral', highlight boolean DEFAULT false);",

      "-- 8. Tabelas de Categorias e Banners",
      "CREATE TABLE IF NOT EXISTS public.categories (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), name text NOT NULL UNIQUE);",
      "CREATE TABLE IF NOT EXISTS public.banners (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, created_at timestamptz DEFAULT now(), title text NOT NULL, subtitle text, theme text DEFAULT 'blue');",

      "-- 9. Segurança RLS (Limpeza e Recriação)",
      
      "ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Orders\" ON public.orders;",
      "CREATE POLICY \"Public Access Orders\" ON public.orders FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Customers\" ON public.customers;",
      "CREATE POLICY \"Public Access Customers\" ON public.customers FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Colors\" ON public.colors;",
      "CREATE POLICY \"Public Access Colors\" ON public.colors FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.textures ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Textures\" ON public.textures;",
      "CREATE POLICY \"Public Access Textures\" ON public.textures FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Users\" ON public.app_users;",
      "CREATE POLICY \"Public Access Users\" ON public.app_users FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.filaments ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Filaments\" ON public.filaments;",
      "CREATE POLICY \"Public Access Filaments\" ON public.filaments FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Catalog\" ON public.catalog_products;",
      "CREATE POLICY \"Public Access Catalog\" ON public.catalog_products FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Categories\" ON public.categories;",
      "CREATE POLICY \"Public Access Categories\" ON public.categories FOR ALL USING (true) WITH CHECK (true);",

      "ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;",
      "DROP POLICY IF EXISTS \"Public Access Banners\" ON public.banners;",
      "CREATE POLICY \"Public Access Banners\" ON public.banners FOR ALL USING (true) WITH CHECK (true);",
      
      "-- 10. INSERIR ADMIN PADRÃO (Se não existir)",
      "INSERT INTO public.app_users (name, username, password, role) SELECT 'Administrador', 'admin', 'passroot', 'admin' WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE username = 'admin');"
    ].join('\n');
  };

  const copySql = () => {
    navigator.clipboard.writeText(getSqlScript());
    alert("SQL Completo (v18) copiado! Cole no SQL Editor do Supabase.");
  };

  const partLabels: Record<keyof PartsColors, string> = { base: 'Base', ball: 'Bola', top: 'Tampa/Topo' };
  const partIcons: Record<keyof PartsColors, React.ReactNode> = { base: <Box className="w-4 h-4" />, ball: <Circle className="w-4 h-4" />, top: <Triangle className="w-4 h-4" /> };

  const COLORS_PIE = ['#4F46E5', '#3B82F6', '#F59E0B', '#FCD34D'];

  const getRatingColor = (r: string) => {
     if(r === 'Ótimo') return 'text-green-600 bg-green-50 border-green-200';
     if(r === 'Bom') return 'text-blue-600 bg-blue-50 border-blue-200';
     if(r === 'Médio') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
     return 'text-red-600 bg-red-50 border-red-200';
  };

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
                Partes & Cores
            </button>
            {isAdmin && (
             <>
               <button
                  onClick={() => setActiveTab('catalog')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'catalog' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
               >
                  Catálogo (Vitrine)
              </button>
               <button
                  onClick={() => setActiveTab('filaments')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'filaments' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
               >
                  Filamentos
              </button>
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
                  Nuvem
              </button>
              <button
                  onClick={() => setActiveTab('testing')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'testing' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}
              >
                  Testes
              </button>
             </>
            )}
        </div>
      </div>

      {!isAdmin && (activeTab === 'cloud' || activeTab === 'testing' || activeTab === 'users' || activeTab === 'reports' || activeTab === 'filaments' || activeTab === 'catalog') && (
        <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg text-red-700">
           <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-50" />
           <h3 className="font-bold">Acesso Negado</h3>
           <p>Você não tem permissão para acessar esta área.</p>
        </div>
      )}

      {/* --- CATALOG TAB --- */}
      {isAdmin && activeTab === 'catalog' && (
         <CatalogManager />
      )}

      {/* --- FILAMENTS TAB --- */}
      {isAdmin && activeTab === 'filaments' && (
         <div className="space-y-6">
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <Disc className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Estoque de Filamentos</h3>
                    <p className="text-sm text-slate-500">Gerencie seu inventário de bobinas.</p>
                 </div>
            </div>

            {/* Add Filament Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Filamento</h4>
                <form onSubmit={handleAddFilament} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Marca</label>
                        <input 
                           type="text" 
                           placeholder="Ex: Voolt3D" 
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                           value={newFilament.brand}
                           onChange={e => setNewFilament({...newFilament, brand: e.target.value})}
                           required 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tipo</label>
                        <select 
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                           value={newFilament.type}
                           onChange={e => setNewFilament({...newFilament, type: e.target.value as FilamentType})}
                        >
                            <option value="PLA">PLA</option>
                            <option value="PLAHS">PLA High Speed</option>
                            <option value="PETG">PETG</option>
                            <option value="PETGHS">PETG High Speed</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    {newFilament.type === 'Outros' && (
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Qual Tipo?</label>
                            <input 
                               type="text" 
                               placeholder="Ex: ABS, TPU..." 
                               className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                               value={newFilament.customType}
                               onChange={e => setNewFilament({...newFilament, customType: e.target.value})}
                               required 
                            />
                        </div>
                    )}
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Cor</label>
                        <div className="flex gap-2">
                             <input 
                                type="color" 
                                className="h-9 w-9 p-0.5 rounded border border-slate-300 cursor-pointer bg-white"
                                value={newFilament.colorHex}
                                onChange={e => setNewFilament({...newFilament, colorHex: e.target.value})}
                             />
                             <input 
                                type="text" 
                                placeholder="Nome da Cor" 
                                className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                                value={newFilament.colorName}
                                onChange={e => setNewFilament({...newFilament, colorName: e.target.value})}
                                required
                             />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Avaliação</label>
                        <select 
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                           value={newFilament.rating}
                           onChange={e => setNewFilament({...newFilament, rating: e.target.value as FilamentRating})}
                        >
                            <option value="Ótimo">Ótimo</option>
                            <option value="Bom">Bom</option>
                            <option value="Médio">Médio</option>
                            <option value="Ruim">Ruim</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Qtd.</label>
                        <input 
                           type="number" 
                           min="0"
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                           value={newFilament.quantity}
                           onChange={e => setNewFilament({...newFilament, quantity: parseInt(e.target.value) || 0})}
                        />
                    </div>
                     <div className="md:col-span-1">
                         <Button type="submit" className="w-full h-[38px]">
                             Adicionar
                         </Button>
                     </div>
                </form>
            </div>

            {/* List */}
            {loadingFilaments ? (
                <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>
            ) : filaments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">Nenhum filamento cadastrado no estoque.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filaments.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                             <div className="flex justify-between items-start mb-3">
                                 <div>
                                     <h5 className="font-bold text-slate-900">{item.brand}</h5>
                                     <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">{item.material}</span>
                                 </div>
                                 <div className="text-right">
                                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getRatingColor(item.rating)}`}>{item.rating}</span>
                                 </div>
                             </div>

                             <div className="flex items-center gap-3 mb-4">
                                 <div className="w-8 h-8 rounded-full border border-slate-200 shadow-inner" style={{ backgroundColor: item.colorHex }}></div>
                                 <span className="text-sm font-medium text-slate-700">{item.colorName}</span>
                             </div>

                             <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                 <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 p-1">
                                     <button 
                                        onClick={() => handleUpdateFilamentQty(item.id, item.quantity, -1)}
                                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                                     >-</button>
                                     <span className="font-bold text-slate-800 w-8 text-center">{item.quantity}</span>
                                     <button 
                                        onClick={() => handleUpdateFilamentQty(item.id, item.quantity, 1)}
                                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm hover:bg-green-50 hover:text-green-600 transition-colors"
                                     >+</button>
                                 </div>
                                 
                                 <button 
                                    onClick={() => handleDeleteFilament(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remover"
                                 >
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      )}

      {/* --- REPORTS TAB --- */}
      {isAdmin && activeTab === 'reports' && (
        <div className="space-y-6">
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Relatórios Financeiros</h3>
                    <p className="text-sm text-slate-500">Acompanhe o desempenho das suas vendas.</p>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs uppercase font-bold">
                     <Package className="w-4 h-4" /> Total Pedidos
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{financialData.totalOrders}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-green-600 text-xs uppercase font-bold">
                     <DollarSign className="w-4 h-4" /> Receita Confirmada
                  </div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(financialData.totalPaid)}</div>
                  <div className="text-xs text-slate-400 mt-1">{financialData.paidOrdersCount} pedidos pagos</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-amber-600 text-xs uppercase font-bold">
                     <Clock className="w-4 h-4" /> Pendente Recebimento
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{formatCurrency(financialData.totalPending)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-blue-600 text-xs uppercase font-bold">
                     <Truck className="w-4 h-4" /> Gasto com Fretes
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(financialData.paidShipping + financialData.pendingShipping)}</div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                   <h4 className="font-semibold text-slate-800 mb-4 text-sm uppercase">Comparativo: Pago vs Pendente</h4>
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartDataStatus} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} />
                       <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                       <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => formatCurrency(value)} />
                       <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                         {chartDataStatus.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#F59E0B'} />
                         ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                   <h4 className="font-semibold text-slate-800 mb-4 text-sm uppercase">Composição da Receita</h4>
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                          data={chartDataComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartDataComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                     </PieChart>
                   </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {isAdmin && activeTab === 'users' && (
         <div className="space-y-6">
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <Users className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Gerenciamento de Usuários</h3>
                    <p className="text-sm text-slate-500">Adicione ou remova acesso ao sistema administrativo.</p>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                   <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       {editingUserId ? <Edit2 className="w-4 h-4"/> : <UserPlus className="w-4 h-4" />} 
                       {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                   </h4>
                   
                   {userMsg && (
                       <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${userMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                           {userMsg.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
                           {userMsg.text}
                       </div>
                   )}

                   <form onSubmit={handleRegisterOrUpdateUser} className="space-y-4">
                       <div>
                           <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Nome Completo</label>
                           <input 
                             type="text" 
                             className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                             value={newUserName}
                             onChange={e => setNewUserName(e.target.value)}
                             required
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Login (Username)</label>
                           <input 
                             type="text" 
                             className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                             value={newUserLogin}
                             onChange={e => setNewUserLogin(e.target.value)}
                             required
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Senha</label>
                           <input 
                             type="text" // Visible for admin ease
                             className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                             value={newUserPass}
                             onChange={e => setNewUserPass(e.target.value)}
                             placeholder={editingUserId ? "Deixe em branco para manter" : ""}
                             required={!editingUserId}
                           />
                       </div>
                       <div className="flex items-center gap-2 pt-2">
                           <input 
                             type="checkbox" 
                             id="isAdmin"
                             checked={newUserIsAdmin}
                             onChange={e => setNewUserIsAdmin(e.target.checked)}
                             className="w-4 h-4 text-indigo-600 rounded"
                           />
                           <label htmlFor="isAdmin" className="text-sm text-slate-700 select-none">Acesso Admin Total</label>
                       </div>
                       
                       <div className="pt-2 flex gap-2">
                           {editingUserId && (
                               <Button type="button" variant="secondary" onClick={resetUserForm} className="flex-1">
                                   Cancelar
                               </Button>
                           )}
                           <Button type="submit" disabled={isRegistering} className="flex-1">
                               {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                               Salvar
                           </Button>
                       </div>
                   </form>
               </div>

               <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h4 className="font-semibold text-slate-800 mb-4">Usuários Cadastrados ({usersList.length})</h4>
                   {isLoadingUsers ? (
                       <div className="text-center py-8 text-slate-400">Carregando...</div>
                   ) : (
                       <div className="space-y-3">
                           {usersList.map(user => (
                               <div key={user.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors bg-slate-50">
                                   <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                           {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                       </div>
                                       <div>
                                           <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                                           <p className="text-xs text-slate-500 flex items-center gap-1">
                                               <span className="font-mono bg-white px-1 rounded border border-slate-200">@{user.username}</span>
                                               {user.role === 'admin' && <span className="text-indigo-600 font-bold ml-1">ADMIN</span>}
                                           </p>
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <button onClick={() => handleEditUser(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                           <Edit2 className="w-4 h-4" />
                                       </button>
                                       {user.username !== 'admin' && (
                                           <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       )}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
            </div>
         </div>
      )}

      {/* --- CLOUD TAB --- */}
      {isAdmin && activeTab === 'cloud' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-full ${isCloudConfigured ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                  {isCloudConfigured ? <CheckCircle className="w-8 h-8" /> : <Cloud className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isCloudConfigured ? 'Conectado à Nuvem (Produção)' : 'Configuração de Nuvem (Supabase)'}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {isCloudConfigured 
                      ? 'Seus dados estão sendo sincronizados em tempo real.' 
                      : 'Conecte-se para sincronizar pedidos entre dispositivos.'}
                  </p>
                </div>
              </div>

              {!isCloudConfigured ? (
                <form onSubmit={(e) => handleSaveCloudConfig(e, 'prod')} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                    <input 
                      type="text" 
                      value={supabaseConfig.supabaseUrl}
                      onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseUrl: e.target.value})}
                      placeholder="https://xyz.supabase.co"
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Anon Public Key</label>
                    <input 
                      type="password" 
                      value={supabaseConfig.supabaseKey}
                      onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseKey: e.target.value})}
                      placeholder="eyJh..."
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                      required
                    />
                  </div>

                  {testResult && !testResult.success && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {testResult.message}
                    </div>
                  )}

                  <Button type="submit" disabled={isTesting}>
                    {isTesting ? 'Testando Conexão...' : 'Salvar e Conectar'}
                  </Button>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100">
                     <p className="text-xs text-slate-500 mb-2">Ainda não tem o banco configurado?</p>
                     <div className="flex gap-2">
                       <Button type="button" variant="outline" size="sm" onClick={() => setShowSqlPreview(!showSqlPreview)}>
                          {showSqlPreview ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />} 
                          {showSqlPreview ? 'Ocultar Script SQL' : 'Ver Script SQL'}
                       </Button>
                       <Button type="button" variant="outline" size="sm" onClick={copySql}>
                          <Copy className="w-3 h-3 mr-2" /> Copiar
                       </Button>
                     </div>
                     
                     {showSqlPreview && (
                        <div className="mt-3 bg-slate-800 rounded-lg p-3 overflow-hidden border border-slate-700 animate-fade-in">
                            <pre className="text-[10px] text-emerald-400 font-mono overflow-auto max-h-64 whitespace-pre-wrap">
                                {getSqlScript()}
                            </pre>
                        </div>
                     )}
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-slate-500 text-xs uppercase font-bold">URL do Projeto</span>
                        <span className="font-mono text-slate-700">{supabaseConfig.supabaseUrl}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 text-xs uppercase font-bold">Status</span>
                        <span className="text-green-600 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button variant="danger" onClick={handleClearCloudConfig}>
                      <CloudOff className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setShowSqlPreview(!showSqlPreview)}>
                           {showSqlPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                           {showSqlPreview ? 'Ocultar SQL' : 'Ver SQL'}
                         </Button>
                         <Button variant="outline" onClick={copySql}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                         </Button>
                    </div>
                  </div>

                  {showSqlPreview && (
                        <div className="mt-4 bg-slate-800 rounded-lg p-4 overflow-hidden border border-slate-700 animate-fade-in">
                            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                                <span className="text-slate-400 text-xs font-mono">setup_database.sql</span>
                                <span className="text-xs text-emerald-500">v18</span>
                            </div>
                            <pre className="text-xs text-emerald-300 font-mono overflow-auto max-h-80 whitespace-pre-wrap">
                                {getSqlScript()}
                            </pre>
                        </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TESTING TAB --- */}
      {isAdmin && activeTab === 'testing' && (
         <div className="space-y-6">
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <Beaker className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Ambiente de Testes (Sandbox)</h3>
                    <p className="text-sm text-slate-500">Configure um banco de dados separado para testes seguros.</p>
                 </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                  <div>
                      <h4 className="font-bold text-slate-800">Status do Ambiente</h4>
                      <p className="text-sm text-slate-500">Você está atualmente em: <strong className="uppercase">{currentEnv === 'prod' ? 'Produção' : 'Testes'}</strong></p>
                  </div>
                  <div className="flex gap-2">
                      <Button 
                         variant={currentEnv === 'prod' ? 'primary' : 'outline'} 
                         onClick={() => handleSwitchEnv('prod')}
                         className={currentEnv === 'prod' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      >
                         Produção
                      </Button>
                      <Button 
                         variant={currentEnv === 'test' ? 'primary' : 'outline'} 
                         onClick={() => handleSwitchEnv('test')}
                         className={currentEnv === 'test' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                      >
                         Testes
                      </Button>
                  </div>
               </div>

               <h4 className="font-bold text-slate-800 mb-4">Configuração do Banco de Testes</h4>
               <form onSubmit={(e) => handleSaveCloudConfig(e, 'test')} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Project URL</label>
                    <input 
                      type="text" 
                      value={testConfig.supabaseUrl}
                      onChange={(e) => setTestConfig({...testConfig, supabaseUrl: e.target.value})}
                      placeholder="https://test-project.supabase.co"
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Anon Key</label>
                    <input 
                      type="password" 
                      value={testConfig.supabaseKey}
                      onChange={(e) => setTestConfig({...testConfig, supabaseKey: e.target.value})}
                      placeholder="eyJh..."
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                    />
                  </div>
                  
                  {testResult && !testResult.success && activeTab === 'testing' && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {testResult.message}
                    </div>
                  )}

                  <Button type="submit" disabled={isTesting}>
                    {isTesting ? 'Verificando...' : 'Salvar Configuração de Teste'}
                  </Button>
               </form>
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
