
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LayoutDashboard, PlusCircle, Settings, ExternalLink, Database, Beaker, LogOut, User, Store } from 'lucide-react';
import { Order, OrderStatus, PartsColors, DEFAULT_COLORS, DEFAULT_TEXTURES, SupabaseConfig, Texture, AppUser, ProductConfig } from './types';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { StatsDashboard } from './components/StatsDashboard';
import { AdminSettings } from './components/AdminSettings';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
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

// --- CONFIGURAÇÃO FIXA ---
// IMPORTANTE: Se você estiver usando o modo de TESTE, esta configuração será IGNORADA.
// Ela serve apenas como fallback para produção.
const FIXED_CONFIG = {
  url: "https://ptymvjqnsxdllljqaeqz.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eW12anFuc3hkbGxsanFhZXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTk5NjgsImV4cCI6MjA4MDk3NTk2OH0.N6To6n4hKRBFAtQKq1XUahR-LEDyfenekBiI_GoLkDk"
};

const App: React.FC = () => {
  // State to control Landing Page vs App
  const [showLanding, setShowLanding] = useState(true);

  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'admin' | 'edit'>('list');
  const [isOnline, setIsOnline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); 
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  
  // Refs para controle de detecção de novos pedidos
  const previousOrdersCount = useRef<number | null>(null);
  
  // Inicialização PREGUIÇOSA (Lazy) para garantir que o estado comece correto
  const [isTestMode, setIsTestMode] = useState(() => {
     const savedMode = localStorage.getItem('app-env-mode');
     return savedMode === 'test';
  });

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

  // Detecta novos pedidos chegando
  useEffect(() => {
    // Se é a primeira carga (null), apenas definimos o valor atual sem alertar
    if (previousOrdersCount.current === null) {
        if (orders.length > 0) {
            previousOrdersCount.current = orders.length;
        }
        return;
    }

    // Se a quantidade aumentou, ativamos o alerta
    if (orders.length > previousOrdersCount.current) {
        setNewOrderAlert(true);
    }

    previousOrdersCount.current = orders.length;
  }, [orders]);

  // Init Supabase and Load Data
  useEffect(() => {
    let configToUse: SupabaseConfig | null = null;
    
    // Ler o modo novamente para garantir
    const envMode = localStorage.getItem('app-env-mode') || 'prod';
    const currentIsTest = envMode === 'test';
    
    console.log(`App: Inicializando. Modo: ${envMode.toUpperCase()}`);

    if (currentIsTest) {
        // --- MODO TESTE ---
        // Busca APENAS do LocalStorage. Ignora FIXED_CONFIG.
        const testConfigStr = localStorage.getItem('app-supabase-config-test');
        if (testConfigStr) {
            try {
                configToUse = JSON.parse(testConfigStr);
                console.log("App: Usando configuração de TESTE salva.");
            } catch (e) {
                console.warn("App: Configuração de teste inválida (JSON error).");
            }
        } else {
            console.warn("App: Modo TESTE ativo, mas nenhuma configuração encontrada em 'app-supabase-config-test'.");
        }
    } else {
        // --- MODO PRODUÇÃO ---
        // Prioridade 1: Configuração salva manualmente no LocalStorage
        const localConfigStr = localStorage.getItem('app-supabase-config');
        if (localConfigStr) {
            try {
                const parsed = JSON.parse(localConfigStr);
                if (parsed && parsed.supabaseUrl && parsed.supabaseKey) {
                    configToUse = parsed;
                    console.log("App: Usando configuração de PRODUÇÃO manual.");
                }
            } catch (e) {}
        }

        // Prioridade 2: Fallback para FIXED_CONFIG se não houver manual
        if (!configToUse && FIXED_CONFIG.url && FIXED_CONFIG.key) {
            console.log("App: Usando configuração de PRODUÇÃO FIXA (Fallback).");
            configToUse = {
                supabaseUrl: FIXED_CONFIG.url,
                supabaseKey: FIXED_CONFIG.key
            };
            // Salva para persistência visual
            localStorage.setItem('app-supabase-config', JSON.stringify(configToUse));
        }
    }

    // TENTATIVA DE CONEXÃO
    let connected = false;
    let unsubscribe = () => {};

    if (configToUse) {
      connected = initSupabase(configToUse);
      if (connected) {
          console.log("App: Supabase conectado com sucesso.");
          setIsOnline(true);
      } else {
          console.error("App: Falha na conexão com Supabase.");
          setIsOnline(false);
      }
    } else {
      console.warn("App: Sem configuração válida para conectar.");
      setIsOnline(false);
    }

    if (connected) {
      // Subscribe to Orders
      unsubscribe = subscribeToOrders((cloudOrders) => {
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
      console.log("App: Carregando dados offline.");
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
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (isOnline) await updateOrderStatusInSupabase(id, status);
  };

  const handleUpdatePaid = async (id: string, isPaid: boolean) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, isPaid } : o));
    if (isOnline) await updateOrderPaidInSupabase(id, isPaid);
  };

  const handleUpdateProducts = async (id: string, products: ProductConfig[]) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, products } : o));
    if (isOnline) await updateOrderProducts(id, products);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setView('edit');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('list');
    setShowLanding(true); 
  };

  if (showLanding) {
    return (
      <LandingPage 
        onEnterProduction={() => setShowLanding(false)} 
        isOnline={isOnline} 
        partsColors={partsColors}
        availableTextures={availableTextures.map(t => t.name)}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} isOnline={isOnline} onBack={() => setShowLanding(true)} />;
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
                onClick={() => setShowLanding(true)}
                className="flex items-center gap-1 hover:text-sky-400 transition-colors mr-2 text-slate-300"
                title="Voltar para o site"
              >
                <Store className="w-3 h-3" /> Ir para Loja
              </button>
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
              <span className="text-2xl font-bold tracking-tight text-sky-400">[]</span>
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
                newOrderAlert={newOrderAlert}
                onClearAlert={() => setNewOrderAlert(false)}
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
            &copy; {new Date().getFullYear()} PrintMy[]3D. Controle de Produção.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
