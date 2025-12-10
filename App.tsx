import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LayoutDashboard, PlusCircle, Settings, ExternalLink, Cloud } from 'lucide-react';
import { Order, OrderStatus, PartsColors, DEFAULT_COLORS, DEFAULT_TEXTURES, FirebaseConfig } from './types';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { StatsDashboard } from './components/StatsDashboard';
import { AdminSettings } from './components/AdminSettings';
import { AdminLogin } from './components/AdminLogin';
import { Button } from './components/ui/Button';
import { 
  initFirebase, 
  subscribeToOrders, 
  addOrderToFirebase, 
  updateOrderStatusInFirebase, 
  updateOrderPaidInFirebase, 
  deleteOrderFromFirebase 
} from './services/firebase';

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'admin'>('list');
  const [isFirebaseEnabled, setIsFirebaseEnabled] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Config State - Updated to separate parts
  const [partsColors, setPartsColors] = useState<PartsColors>(() => {
    const saved = localStorage.getItem('app-parts-colors');
    if (saved) {
      return JSON.parse(saved);
    }
    // Migration/Fallback: If no specific parts config, use default for all
    return {
      base: [...DEFAULT_COLORS],
      ball: [...DEFAULT_COLORS],
      top: [...DEFAULT_COLORS]
    };
  });

  const [availableTextures, setAvailableTextures] = useState<string[]>(() => {
    const saved = localStorage.getItem('app-textures');
    return saved ? JSON.parse(saved) : DEFAULT_TEXTURES;
  });

  // Init Firebase and Load Data
  useEffect(() => {
    const firebaseConfigStr = localStorage.getItem('app-firebase-config');
    let connected = false;

    if (firebaseConfigStr) {
      const config: FirebaseConfig = JSON.parse(firebaseConfigStr);
      connected = initFirebase(config);
      setIsFirebaseEnabled(connected);
    }

    if (connected) {
      // Subscribe to Cloud Data
      const unsubscribe = subscribeToOrders((cloudOrders) => {
        setOrders(cloudOrders);
      });
      return () => unsubscribe();
    } else {
      // Fallback to Local Storage
      const savedOrders = localStorage.getItem('3d-print-orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          
          // Migration: Check if orders have 'product' instead of 'products'
          const migratedOrders = parsed.map((order: any) => {
            if (order.products) return order;
            
            // Convert old single product to array
            if (order.product) {
              const legacyProduct = { ...order.product, id: uuidv4() };
              return {
                ...order,
                products: [legacyProduct],
                product: undefined // Remove old key
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
  }, []);

  // Save Orders to LocalStorage (Only if Firebase NOT enabled)
  useEffect(() => {
    if (!isFirebaseEnabled) {
      localStorage.setItem('3d-print-orders', JSON.stringify(orders));
    }
  }, [orders, isFirebaseEnabled]);

  // Save Config to LocalStorage (New Key)
  useEffect(() => {
    localStorage.setItem('app-parts-colors', JSON.stringify(partsColors));
  }, [partsColors]);

  useEffect(() => {
    localStorage.setItem('app-textures', JSON.stringify(availableTextures));
  }, [availableTextures]);

  const handleSaveOrder = async (newOrderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    const newOrder: Order = {
      ...newOrderData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      status: 'Pendente'
    };

    if (isFirebaseEnabled) {
      try {
        await addOrderToFirebase(newOrder);
        // We don't need to manually setOrders here because the subscription will trigger
      } catch (e) {
        alert("Erro ao salvar no Firebase. Verifique sua conexão.");
        return;
      }
    } else {
      setOrders(prev => [newOrder, ...prev]);
    }
    setView('list');
  };

  const handleDeleteOrder = async (id: string) => {
    if (isFirebaseEnabled) {
       await deleteOrderFromFirebase(id);
    } else {
       setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    if (isFirebaseEnabled) {
      await updateOrderStatusInFirebase(id, status);
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const handleUpdatePaid = async (id: string, isPaid: boolean) => {
    if (isFirebaseEnabled) {
      await updateOrderPaidInFirebase(id, isPaid);
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, isPaid } : o));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar for Melhor Envio */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="flex items-center gap-2">
              {isFirebaseEnabled ? (
                <span className="flex items-center gap-1 text-green-400 font-bold">
                  <Cloud className="w-3 h-3" /> Online (Firebase)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                   Modo Local (Offline)
                </span>
              )}
            </span>
            <a 
              href="https://melhorenvio.com.br/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-sky-300 transition-colors font-medium"
            >
              Ir para Melhor Envio <ExternalLink className="w-3 h-3" />
            </a>
         </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer select-none font-logo" onClick={() => setView('list')}>
              <span className="text-2xl font-bold tracking-tight text-slate-900">PrintMy</span>
              <span className="text-2xl font-bold tracking-tight text-sky-400">[PET]</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">3D</span>
            </div>
            
            <nav className="flex gap-2">
              <Button 
                variant={view === 'list' ? 'secondary' : 'outline'} 
                onClick={() => setView('list')}
                className={view === 'list' ? 'bg-slate-100' : ''}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Painel</span>
              </Button>
              <Button 
                variant={view === 'new' ? 'primary' : 'outline'} 
                onClick={() => setView('new')}
                className={view === 'new' ? 'ring-2 ring-indigo-200' : ''}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Novo Pedido</span>
              </Button>
              <Button 
                variant={view === 'admin' ? 'secondary' : 'outline'} 
                onClick={() => setView('admin')}
                className={view === 'admin' ? 'bg-slate-100' : ''}
                title="Configurações"
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
        {view === 'new' && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Novo Pedido de Impressão</h2>
              <p className="text-slate-500">Adicione um ou mais produtos ao pedido e preencha os dados do cliente.</p>
            </div>
            <OrderForm 
              onSave={handleSaveOrder} 
              onCancel={() => setView('list')} 
              partsColors={partsColors}
              availableTextures={availableTextures}
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
             />
          </div>
        )}

        {view === 'admin' && (
          isAdminAuthenticated ? (
            <AdminSettings 
              partsColors={partsColors}
              textures={availableTextures}
              onUpdatePartsColors={setPartsColors}
              onUpdateTextures={setAvailableTextures}
            />
          ) : (
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
          )
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
