
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LayoutDashboard, PlusCircle, Settings, ExternalLink, Database, Beaker, LogOut, User } from 'lucide-react';
import { Order, OrderStatus, PartsColors, DEFAULT_COLORS, DEFAULT_TEXTURES, SupabaseConfig, Texture, AppUser } from './types';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { StatsDashboard } from './components/StatsDashboard';
import { AdminSettings } from './components/AdminSettings';
import { LoginPage } from './components/LoginPage';
import { Button } from './components/ui/Button';
import { 
  initSupabase, 
  subscribeToOrders, 
  addOrderToSupabase, 
  updateOrderInSupabase,
  updateOrderStatusInSupabase, 
  updateOrderPaidInSupabase, 
  deleteOrderFromSupabase,
  fetchColorsFromSupabase,
  fetchTexturesFromSupabase
} from './services/supabase';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'admin' | 'edit'>('list');
  const [isOnline, setIsOnline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); 
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // Config State
  const [partsColors, setPartsColors] = useState<PartsColors>(() => {
    const saved = localStorage.getItem('app-parts-colors');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      base: [...DEFAULT_COLORS],
      ball: [...DEFAULT_COLORS],
      top: [...DEFAULT_COLORS]
    };
  });

  const [availableTextures, setAvailableTextures] = useState<Texture[]>(() => {
    const saved = localStorage.getItem('app-textures-v2');
    if (saved) {
      return JSON.parse(saved);
    }
    const oldSaved = localStorage.getItem('app-textures');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
           return parsed.map(t => ({ id: uuidv4(), name: t }));
        }
      } catch (e) {}
    }
    return DEFAULT_TEXTURES.map(t => ({ id: uuidv4(), name: t }));
  });

  // Init Supabase and Load Data
  useEffect(() => {
    // 1. Determine Environment
    const envMode = localStorage.getItem('app-env-mode') || 'prod';
    setIsTestMode(envMode === 'test');

    const configKey = envMode === 'test' ? 'app-supabase-config-test' : 'app-supabase-config';
    const localConfigStr = localStorage.getItem(configKey);
    
    // Check for Environment Variables (Vercel / .env)
    const envConfig: SupabaseConfig = {
      supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || '',
      supabaseKey: (import.meta as any).env?.VITE_SUPABASE_KEY || ''
    };

    let configToUse: SupabaseConfig | null = null;
    let connected = false;
    let unsubscribe = () => {};

    if (localConfigStr) {
      try {
        configToUse = JSON.parse(localConfigStr);
      } catch (e) {
        console.error("Invalid local config", e);
      }
    } else if (envMode === 'prod' && envConfig.supabaseUrl && envConfig.supabaseKey) {
      // Only fallback to .env for production
      configToUse = envConfig;
    }

    if (configToUse) {
      connected = initSupabase(configToUse);
      setIsOnline(connected);
    } else {
      setIsOnline(false);
    }

    if (connected) {
      // 1. Subscribe to Orders
      unsubscribe = subscribeToOrders((cloudOrders) => {
        setOrders(cloudOrders);
      });

      // 2. Fetch Colors from DB
      fetchColorsFromSupabase().then(dbColors => {
        if (dbColors && (dbColors.base.length > 0 || dbColors.ball.length > 0)) {
            setPartsColors(dbColors);
        }
      });

      // 3. Fetch Textures from DB
      fetchTexturesFromSupabase().then(dbTextures => {
        if (dbTextures && dbTextures.length > 0) {
          setAvailableTextures(dbTextures);
        }
      });

    } else {
      // Fallback to Local Storage
      const savedOrders = localStorage.getItem('3d-print-orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          const migratedOrders = parsed.map((order: any) => {
            if (order.products) return order;
            if (order.product) {
              const legacyProduct = { ...order.product, id: uuidv4() };
              return {
                ...order,
                products: [legacyProduct],
                product: undefined
              } as Order;
            }
            return order;
          });
          setOrders(migratedOrders);
        } catch (e) {
          console.error("Failed to parse orders", e);
        }
      }
    }

    return () => {
      unsubscribe();
    };
  }, [reloadKey]); 

  // Save Orders to LocalStorage (Only if Offline)
  useEffect(() => {
    if (!isOnline) {
      localStorage.setItem('3d-print-orders', JSON.stringify(orders));
    }
  }, [orders, isOnline]);

  // Save Config to LocalStorage (Backup/Offline)
  useEffect(() => {
    localStorage.setItem('app-parts-colors', JSON.stringify(partsColors));
  }, [partsColors]);

  useEffect(() => {
    localStorage.setItem('app-textures-v2', JSON.stringify(availableTextures));
  }, [availableTextures]);

  const handleConfigUpdate = () => {
    setReloadKey(prev => prev + 1);
  };

  const refreshConfig = async () => {
    if (isOnline) {
       const dbColors = await fetchColorsFromSupabase();
       if (dbColors) setPartsColors(dbColors);
       
       const dbTextures = await fetchTexturesFromSupabase();
       if (dbTextures) setAvailableTextures(dbTextures);
    }
  };

  const handleSaveOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    if (editingOrder) {
      // UPDATE Logic
      const updatedOrder: Order = {
        ...editingOrder,
        ...orderData,
        // Preserve original sensitive fields unless specifically needed to change
        // customer.id is handled in upsert logic inside the form/service
      };

      if (isOnline) {
        try {
          await updateOrderInSupabase(updatedOrder);
        } catch (e: any) {
          alert(`Erro ao atualizar: ${e.message}`);
          return;
        }
      } else {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
      }

    } else {
      // CREATE Logic
      const newOrder: Order = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: 'Pendente'
      };

      if (isOnline) {
        try {
          await addOrderToSupabase(newOrder);
        } catch (e: any) {
          alert(`Erro ao salvar no Supabase: ${e.message}`);
          return;
        }
      } else {
        setOrders(prev => [newOrder, ...prev]);
      }
    }
    
    setEditingOrder(null);
    setView('list');
  };

  const handleDeleteOrder = async (id: string) => {
    if (isOnline) {
       await deleteOrderFromSupabase(id);
    } else {
       setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    if (isOnline) {
      await updateOrderStatusInSupabase(id, status);
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const handleUpdatePaid = async (id: string, isPaid: boolean) => {
    if (isOnline) {
      await updateOrderPaidInSupabase(id, isPaid);
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, isPaid } : o));
    }
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setView('edit');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('list');
  };

  // If not logged in, show Login Page
  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} isOnline={isOnline} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-orange-600 text-white text-xs font-bold py-1 px-2 text-center flex items-center justify-center gap-2">
           <Beaker className="w-4 h-4" /> AMBIENTE DE TESTES ATIVO - Dados não serão salvos na produção
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="flex items-center gap-2">
              {isOnline ? (
                <span className={`flex items-center gap-1 font-bold ${isTestMode ? 'text-orange-400' : 'text-emerald-400'}`}>
                  <Database className="w-3 h-3" /> Online ({isTestMode ? 'Teste' : 'Prod'})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                   Modo Local (Offline)
                </span>
              )}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-300">
                <User className="w-3 h-3" /> {currentUser.name} ({currentUser.role})
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="w-3 h-3" /> Sair
              </button>
            </div>
         </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer select-none font-logo" onClick={() => { setView('list'); setEditingOrder(null); }}>
              <span className="text-2xl font-bold tracking-tight text-slate-900">PrintMy</span>
              <span className="text-2xl font-bold tracking-tight text-sky-400">[PET]</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">3D</span>
            </div>
            
            <nav className="flex gap-2">
              <Button 
                variant={view === 'list' ? 'secondary' : 'outline'} 
                onClick={() => { setView('list'); setEditingOrder(null); }}
                className={view === 'list' ? 'bg-slate-100' : ''}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Painel</span>
              </Button>
              <Button 
                variant={(view === 'new' || view === 'edit') ? 'primary' : 'outline'} 
                onClick={() => { setView('new'); setEditingOrder(null); }}
                className={(view === 'new' || view === 'edit') ? 'ring-2 ring-indigo-200' : ''}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Novo Pedido</span>
              </Button>
              <Button 
                variant={view === 'admin' ? 'secondary' : 'outline'} 
                onClick={() => { setView('admin'); setEditingOrder(null); }}
                className={view === 'admin' ? 'bg-slate-100' : ''}
                title="Configurações e Login"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(view === 'new' || view === 'edit') && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {view === 'edit' ? 'Editar Pedido' : 'Novo Pedido de Impressão'}
              </h2>
              <p className="text-slate-500">
                {view === 'edit' 
                  ? 'Atualize as informações dos produtos ou do cliente.' 
                  : 'Adicione um ou mais produtos ao pedido e preencha os dados do cliente.'}
              </p>
            </div>
            <OrderForm 
              key={view === 'edit' ? editingOrder?.id : 'new'}
              initialOrder={view === 'edit' ? editingOrder : null}
              onSave={handleSaveOrder} 
              onCancel={() => { setView('list'); setEditingOrder(null); }} 
              partsColors={partsColors}
              availableTextures={availableTextures.map(t => t.name)}
            />
          </div>
        )}

        {view === 'list' && (
          <div className="animate-fade-in">
             <StatsDashboard orders={orders} />
             <OrderList 
                orders={orders} 
                onUpdateStatus={handleUpdateStatus} 
                onUpdatePaid={handleUpdatePaid}
                onDelete={handleDeleteOrder}
                onEdit={handleEditClick}
             />
          </div>
        )}

        {view === 'admin' && (
          <AdminSettings 
            partsColors={partsColors}
            textures={availableTextures}
            onUpdatePartsColors={setPartsColors}
            onUpdateTextures={setAvailableTextures}
            onConfigUpdate={handleConfigUpdate}
            onRefreshColors={refreshConfig}
            isOnline={isOnline}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} PrintMy[PET]3D. Controle de Produção.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
