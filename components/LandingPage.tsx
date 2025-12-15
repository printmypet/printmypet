import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight, LogIn, ShoppingBag, Plus, X, Search, Filter, Instagram, Phone, Mail, MapPin, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { Banner, CatalogProduct, Category, Order, PartsColors } from '../types';
import { fetchBanners, fetchCatalogProducts, fetchCategories, addOrderToSupabase } from '../services/supabase';
import { Button } from './ui/Button';
import { OrderForm } from './OrderForm';

interface LandingPageProps {
  onEnterProduction: () => void;
  isOnline: boolean;
  partsColors: PartsColors;
  availableTextures: string[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onEnterProduction, 
  isOnline,
  partsColors,
  availableTextures
}) => {
  const [activeBanners, setActiveBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      if (isOnline) {
        const bannersData = await fetchBanners();
        setActiveBanners(bannersData);
        
        const productsData = await fetchCatalogProducts();
        setProducts(productsData);

        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
      }
    };
    loadData();
  }, [isOnline]);

  useEffect(() => {
    if (activeBanners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % activeBanners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeBanners]);

  const nextBanner = () => {
    if (activeBanners.length > 0) {
      setCurrentBanner((prev) => (prev + 1) % activeBanners.length);
    }
  };

  const prevBanner = () => {
    if (activeBanners.length > 0) {
      setCurrentBanner((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    }
  };

  const resolveImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path.slice(1) : path;
  };

  const handleSavePublicOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    if (!isOnline) {
       alert("É necessário estar online para enviar pedidos.");
       return;
    }
    
    try {
      const newOrder: Order = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        status: 'Pendente'
      };
      
      await addOrderToSupabase(newOrder);
      setOrderSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar pedido. Tente novamente.");
    }
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setOrderSubmitted(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- NAVBAR --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-logo select-none">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
               <span className="text-xl font-bold text-slate-900 tracking-tight">PrintMy<span className="text-sky-500">[]</span>3D</span>
            </div>

            <div className="flex items-center gap-4">
               <button 
                  onClick={() => setShowOrderModal(true)}
                  className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg active:scale-95 transform"
               >
                  <Plus className="w-4 h-4" />
                  Encomendar Agora
               </button>
               <button 
                  onClick={onEnterProduction}
                  className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
                  title="Acesso da Equipe"
               >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Entrar</span>
               </button>
            </div>
         </div>
      </nav>

      {/* --- HERO BANNER --- */}
      <section className="relative w-full aspect-[5/4] sm:aspect-[16/7] md:aspect-[21/7] bg-slate-900 overflow-hidden group">
         {/* Banner Image */}
         {activeBanners.length > 0 ? (
             <div className="absolute inset-0">
                 <img 
                    src={resolveImagePath(`banners/${activeBanners[currentBanner].imageUrl}`)} 
                    alt="Banner" 
                    className="w-full h-full object-cover animate-fade-in"
                    key={activeBanners[currentBanner].id} // Force re-render for animation
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30"></div>
             </div>
         ) : (
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                 <div className="text-center p-6">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">Impressão 3D Personalizada</h1>
                    <p className="text-indigo-200 text-lg md:text-xl max-w-2xl mx-auto">Transformamos suas ideias em realidade com qualidade e precisão.</p>
                 </div>
             </div>
         )}

         {/* Navigation Arrows */}
         {activeBanners.length > 1 && (
             <>
                 <button 
                    onClick={prevBanner}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/20"
                 >
                     <ChevronLeft className="w-6 h-6" />
                 </button>
                 <button 
                    onClick={nextBanner}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/20"
                 >
                     <ChevronRight className="w-6 h-6" />
                 </button>
                 
                 {/* Indicators */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                     {activeBanners.map((_, idx) => (
                         <button 
                            key={idx}
                            onClick={() => setCurrentBanner(idx)} 
                            className={`w-2 h-2 rounded-full transition-all ${currentBanner === idx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
                         ></button>
                     ))}
                 </div>
             </>
         )}
         
         {/* Hero CTA Content (Overlay) */}
         {activeBanners.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center px-4 mt-10 md:mt-20">
                     <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg opacity-0 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                         Qualidade em cada camada
                     </h2>
                     <button 
                        onClick={() => setShowOrderModal(true)}
                        className="pointer-events-auto bg-indigo-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-indigo-500 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 opacity-0 animate-fade-in-up" 
                        style={{animationDelay: '0.4s'}}
                     >
                         Fazer Pedido Agora
                     </button>
                </div>
            </div>
         )}
      </section>

      {/* --- CATALOG SECTION --- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
         
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <div>
                 <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                     <ShoppingBag className="w-6 h-6 text-indigo-600" />
                     Nossos Produtos
                 </h2>
                 <p className="text-slate-500">Explore nossa coleção de itens prontos para impressão</p>
             </div>

             <div className="flex flex-wrap gap-2 items-center">
                 <div className="relative">
                     <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-full border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
                     />
                 </div>
             </div>
         </div>

         {/* Categories Filter */}
         <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
             <button 
                onClick={() => setSelectedCategory('Todos')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === 'Todos' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
             >
                Todos
             </button>
             {categories.map(cat => (
                 <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === cat.name ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                 >
                    {cat.name}
                 </button>
             ))}
         </div>

         {/* Products Grid */}
         {filteredProducts.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                 <div className="inline-flex bg-slate-100 p-4 rounded-full mb-4">
                    <Search className="w-6 h-6 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">Nenhum produto encontrado</h3>
                 <p className="text-slate-500 max-w-sm mx-auto mt-2">
                     Tente ajustar os filtros ou sua busca. Ou faça um pedido personalizado!
                 </p>
                 <button 
                    onClick={() => setShowOrderModal(true)}
                    className="mt-6 text-indigo-600 font-medium hover:underline"
                 >
                     Fazer pedido personalizado
                 </button>
             </div>
         ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filteredProducts.map(product => (
                     <div key={product.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
                         <div className="aspect-square bg-slate-100 relative overflow-hidden">
                             {product.imageUrl ? (
                                 <img 
                                    src={resolveImagePath(product.imageUrl)} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                 />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-300">
                                     <ShoppingBag className="w-12 h-12 opacity-50" />
                                 </div>
                             )}
                             {product.highlight && (
                                 <span className="absolute top-3 right-3 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                     DESTAQUE
                                 </span>
                             )}
                         </div>
                         
                         <div className="p-5 flex-1 flex flex-col">
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                     <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{product.name}</h3>
                                     <p className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded">{product.category}</p>
                                 </div>
                             </div>
                             
                             <p className="text-sm text-slate-600 mb-4 line-clamp-2">{product.description}</p>
                             
                             <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                                 <span className="text-xl font-bold text-slate-900">
                                     R$ {product.price.toFixed(2)}
                                 </span>
                                 <button 
                                    onClick={() => setShowOrderModal(true)}
                                    className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    title="Eu quero este!"
                                 >
                                     <Plus className="w-5 h-5" />
                                 </button>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                  <div className="flex items-center gap-2 font-logo select-none mb-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                    <span className="text-xl font-bold text-white tracking-tight">PrintMy<span className="text-sky-500">[]</span>3D</span>
                  </div>
                  <p className="text-sm leading-relaxed mb-4">
                      Especialistas em impressão 3D de alta qualidade. Trazendo inovação e personalização para seus projetos.
                  </p>
                  <div className="flex gap-4">
                      <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                          <Instagram className="w-4 h-4" />
                      </a>
                      <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                          <Mail className="w-4 h-4" />
                      </a>
                  </div>
              </div>
              
              <div>
                  <h4 className="text-white font-bold mb-4">Contato</h4>
                  <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                          <Phone className="w-4 h-4 mt-0.5 text-indigo-500" />
                          <span>(11) 99999-9999</span>
                      </li>
                      <li className="flex items-start gap-3">
                          <Mail className="w-4 h-4 mt-0.5 text-indigo-500" />
                          <span>contato@printmy3d.com.br</span>
                      </li>
                      <li className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 mt-0.5 text-indigo-500" />
                          <span>Av. Paulista, 1000 - São Paulo, SP</span>
                      </li>
                  </ul>
              </div>
              
              <div>
                  <h4 className="text-white font-bold mb-4">Links Rápidos</h4>
                  <ul className="space-y-2 text-sm">
                      <li><button onClick={() => window.scrollTo(0,0)} className="hover:text-indigo-400 transition-colors">Início</button></li>
                      <li><button onClick={() => setShowOrderModal(true)} className="hover:text-indigo-400 transition-colors">Fazer Pedido</button></li>
                      <li><button onClick={onEnterProduction} className="hover:text-indigo-400 transition-colors">Área do Cliente</button></li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
              &copy; {new Date().getFullYear()} PrintMy[]3D. Todos os direitos reservados.
          </div>
      </footer>

      {/* --- ORDER MODAL --- */}
      {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                  <button 
                    onClick={closeOrderModal}
                    className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"
                  >
                      <X className="w-5 h-5 text-slate-600" />
                  </button>
                  
                  {orderSubmitted ? (
                      <div className="p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
                              <CheckCircle className="w-10 h-10 text-green-600" />
                          </div>
                          <h2 className="text-3xl font-bold text-slate-900 mb-2">Pedido Recebido!</h2>
                          <p className="text-slate-500 max-w-md mx-auto mb-8">
                              Obrigado por sua solicitação. Nossa equipe entrará em contato em breve pelo WhatsApp ou E-mail para confirmar os detalhes e o pagamento.
                          </p>
                          <Button onClick={closeOrderModal} size="lg" className="px-8">
                              Voltar para Loja
                          </Button>
                      </div>
                  ) : (
                      <div className="p-1">
                          <OrderForm 
                              onSave={handleSavePublicOrder}
                              onCancel={closeOrderModal}
                              partsColors={partsColors}
                              availableTextures={availableTextures}
                              isPublic={true}
                          />
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
