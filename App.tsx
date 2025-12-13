
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LayoutDashboard, PlusCircle, Settings, ExternalLink, Database, Beaker, LogOut, User } from 'lucide-react';
import { Order, OrderStatus, PartsColors, DEFAULT_COLORS, DEFAULT_TEXTURES, SupabaseConfig, Texture, AppUser, ProductConfig } from './types';
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
  fetchTexturesFromSupabase,
  updateOrderProducts
} from './services/supabase';

// --- CONFIGURAÇÃO FIXA (HARDCODED) ---
// SE ESTAS CHAVES ESTIVEREM AQUI, ELAS SERÃO USADAS AUTOMATICAMENTE PARA PRODUÇÃO.
const FIXED_CONFIG = {
  url: "https://ptymvjqnsxdllljqaeqz.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eW12anFuc3hkbGxsanFhZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTk5NjgsImV4cCI6MjA4MDk3NTk2OH0.N6To6n4hKRBFAtQKq1XUahR-LEDyfenekBiI_GoLkDk"
};

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
    let configToUse: SupabaseConfig | null = null;
    let isTesting = false;

    // 1. VERIFICAÇÃO FORÇADA DA CONFIGURAÇÃO FIXA
    if (FIXED_CONFIG.url && FIXED_CONFIG.key && FIXED_CONFIG.url.includes('http')) {
        console.log("App: Usando CREDENCIAIS FIXAS do código.");
        configToUse = {
            supabaseUrl: FIXED_CONFIG.url,
            supabaseKey: FIXED_CONFIG.key
        };
        
        // Força modo produção
        localStorage.setItem('app-env-mode', 'prod');
        
        const currentStored = localStorage.getItem('app-supabase-config');
        const configString = JSON.stringify(configToUse);
        if (currentStored !== configString) {
           localStorage.setItem('app-supabase-config', configString);
        }

        isTesting = false;
    } else {
        const envMode = localStorage.getItem('app-env-mode') || 'prod';
        isTesting = envMode === 'test';
        
        const configKey = isTesting ? 'app-supabase-config-test' : 'app-supabase-config';
        const localConfigStr = localStorage.getItem(configKey);

        if (localConfigStr) {
            try {
                const parsed = JSON.parse(localConfigStr);
                if (parsed && parsed.supabaseUrl && parsed.supabaseKey) {
                    configToUse = parsed;
                }
            } catch (e) {
                console.warn("Config local inválida");
            }
        }
    }

    setIsTestMode(isTesting);

    // 2. TENTATIVA DE CONEXÃO
    let connected = false;
    let unsubscribe = () => {};

    if (configToUse) {
      // Tenta inicializar
      connected = initSupabase(configToUse);
      
      if (connected) {
          console.log("App: Conexão inicializada com sucesso.");
          setIsOnline(true);
      } else {
          console.error("App: Falha ao inicializar Supabase. Verifique URL/Key.");
          setIsOnline(false);
      }
    } else {
      console.warn("App: Nenhuma configuração disponível.");
      setIsOnline(false);
    }

    if (connected) {
      // Subscribe to Orders
      unsubscribe = subscribeToOrders((cloudOrders) => {
        // Only update if data is different/newer to avoid overwriting optimistic updates unnecessarily
        // For simplicity in this structure, we just accept the cloud state.
        // Optimistic updates will temporarily override UI, then this callback confirms it.
        setOrders(cloudOrders);
      });

      // Fetch Colors from DB
      fetchColorsFromSupabase().then(dbColors => {
        if (dbColors && (dbColors.base.length > 0 || dbColors.ball.length > 0)) {
            setPartsColors(dbColors);
        }
      });

      // Fetch Textures from DB
      fetchTexturesFromSupabase().then(dbTextures => {
        if (dbTextures && dbTextures.length > 0) {
          setAvailableTextures(dbTextures);
        }
      });

    } else {
      // Fallback to Local Storage (Offline Mode)
      console.log("App: Entrando em modo Offline (Local Storage).");
      const savedOrders = localStorage.getItem('3d-print-orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          const migratedOrders = parsed.map((order: any) => {
            if (order.products) return order;
            if (order.product) {
              const legacyProduct = { ...order.product, id: uuidv4() };
              return { ...order, products: [legacyProduct], product: undefined } as Order;
            }
            return order;
          });
          setOrders(migratedOrders);
        } catch (e) {}
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
      const updatedOrder: Order = {
        ...editingOrder,
        ...orderData,
      };

      if (isOnline) {
        // Optimistic Update for Edit
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
        try {
          await updateOrderInSupabase(updatedOrder);
        } catch (e: any) {
          alert(`Erro ao atualizar: ${e.message}`);
          // Revert or refresh could be added here
          return;
        }
      } else {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
      }

    } else {
      const newOrder: Order = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: 'Pendente'
      };

      if (isOnline) {
        // Optimistic Update for Add
        setOrders(prev => [newOrder, ...prev]);
        try {
          await addOrderToSupabase(newOrder);
        } catch (e: any) {
          alert(`Erro ao salvar no Supabase: ${e.message}`);
          setOrders(prev => prev.filter(o => o.id !== newOrder.id)); // Revert
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
    // Optimistic Delete
    const previousOrders = [...orders];
    setOrders(prev => prev.filter(o => o.id !== id));

    if (isOnline) {
       try {
         await deleteOrderFromSupabase(id);
       } catch (error) {
         console.error("Error deleting", error);
         setOrders(previousOrders); // Revert
         alert("Erro ao excluir pedido online.");
       }
    }
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

    if (isOnline) {
      try {
        await updateOrderStatusInSupabase(id, status);
      } catch(e) {
        console.error("Error updating status", e);
      }
    }
  };

  const handleUpdatePaid = async (id: string, isPaid: boolean) => {
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, isPaid } : o));

    if (isOnline) {
      try {
        await updateOrderPaidInSupabase(id, isPaid);
      } catch(e) {
        console.error("Error updating paid", e);
      }
    }
  };

  const handleUpdateProducts = async (id: string, products: ProductConfig[]) => {
    // Optimistic Update (CRITICAL for the build parts toggle)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, products } : o));

    if (isOnline) {
      try {
        await updateOrderProducts(id, products);
      } catch (e) {
        console.error("Error updating products", e);
      }
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

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} isOnline={isOnline} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isTestMode && (
        <div className="bg-orange-600 text-white text-xs font-bold py-1 px-2 text-center flex items-center justify-center gap-2">
           <Beaker className="w-4 h-4" /> AMBIENTE DE TESTES ATIVO - Dados não serão salvos na produção
        </div>
      )}

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
                onUpdateProducts={handleUpdateProducts}
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
            orders={orders}
          />
        )}
      </main>

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
