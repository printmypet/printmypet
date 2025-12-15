
import React, { useEffect, useState } from 'react';
import { Settings, ShoppingBag, Search, Menu, X, ArrowRight, Filter, ChevronDown, CheckCircle, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { CatalogProduct, Category, Banner, PartsColors, Order } from '../types';
import { fetchCatalogProducts, fetchCategories, fetchBanners, addOrderToSupabase } from '../services/supabase';
import { OrderForm } from './OrderForm';
import { v4 as uuidv4 } from 'uuid';

interface LandingPageProps {
  onEnterProduction: () => void;
  isOnline: boolean;
  partsColors: PartsColors;
  availableTextures: string[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterProduction, isOnline, partsColors, availableTextures }) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Flow State
  const [view, setView] = useState<'store' | 'config' | 'success'>('store');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    loadData();
  }, [isOnline]);

  const loadData = async () => {
    setLoading(true);
    const [prodData, catData, bannerData] = await Promise.all([
        fetchCatalogProducts(),
        fetchCategories(),
        fetchBanners()
    ]);
    
    if (prodData) setProducts(prodData);
    if (catData) setCategories(catData);
    if (bannerData) setBanners(bannerData);
    
    setLoading(false);
  };

  const activeBanners = banners.length > 0 ? banners : [
    // Fallback banner placeholder if none exist
    { id: 'default', imageUrl: 'placeholder.jpg' } 
  ] as Banner[];

  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'Todos') return true;
    if (p.category !== selectedCategory) return false;
    if (selectedSubcategory && p.subcategory !== selectedSubcategory) return false;
    return true;
  });

  const resolveImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path.slice(1) : path;
  };

  // --- Handlers for Order Flow ---
  
  const handleProductClick = (product: CatalogProduct) => {
      setSelectedProduct(product);
      setView('config');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSubmit = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
     try {
         const newOrder: Order = {
             ...orderData,
             id: uuidv4(),
             createdAt: new Date().toISOString(),
             status: 'Pendente'
         };
         await addOrderToSupabase(newOrder);
         setView('success');
         window.scrollTo({ top: 0, behavior: 'smooth' });
     } catch (e) {
         alert("Erro ao realizar pedido. Tente novamente.");
     }
  };

  const handleBackToStore = () => {
      setView('store');
      setSelectedProduct(null);
  };

  const nextBanner = () => {
      setCurrentBanner((prev) => (prev + 1) % activeBanners.length);
  };

  const prevBanner = () => {
      setCurrentBanner((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };


  if (view === 'success') {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center animate-fade-in-up border border-slate-100">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Pedido Realizado!</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                      Recebemos sua solicitação com sucesso. <br/>
                      Nossa equipe entrará em contato em breve via WhatsApp ou Email para confirmar os detalhes e combinar o pagamento.
                  </p>
                  <button 
                      onClick={handleBackToStore}
                      className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                  >
                      <Home className="w-5 h-5" />
                      Voltar para a Loja
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'config') {
      return (
          <div className="min-h-screen bg-slate-50">
              <header className="bg-white shadow-sm border-b border-slate-200 py-4 sticky top-0 z-50">
                  <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
                      <button onClick={handleBackToStore} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowRight className="w-6 h-6 rotate-180 text-slate-600" />
                      </button>
                      <div>
                          <h1 className="text-lg font-bold text-slate-900">Configurar Pedido</h1>
                          {selectedProduct && <p className="text-xs text-slate-500">Item selecionado: {selectedProduct.name}</p>}
                      </div>
                  </div>
              </header>
              <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
                  <OrderForm 
                      partsColors={partsColors}
                      availableTextures={availableTextures}
                      onSave={handleOrderSubmit}
                      onCancel={handleBackToStore}
                      isPublic={true}
                  />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HEADER / TOPBAR --- */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-800 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center select-none font-logo cursor-pointer" onClick={() => setView('store')}>
                <span className="text-2xl font-bold tracking-tight">PrintMy</span>
                <span className="text-2xl font-bold tracking-tight text-sky-400">[]</span>
                <span className="text-2xl font-bold tracking-tight">3D</span>
            </div>

            {/* Desktop Nav - Search */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
                <input 
                    type="text" 
                    placeholder="O que você procura hoje?" 
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-6">
                <button 
                    onClick={onEnterProduction}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
                >
                    <Settings className="w-4 h-4" />
                    Área Admin
                </button>
                <div className="relative group cursor-pointer">
                    <ShoppingBag className="w-6 h-6 text-white" />
                    <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">0</span>
                </div>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
             <div className="md:hidden bg-slate-800 border-t border-slate-700 p-4 space-y-4 animate-fade-in absolute w-full left-0 top-16 shadow-xl">
                 <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg py-2 px-4 pl-10"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
                <button 
                    onClick={onEnterProduction}
                    className="flex w-full items-center gap-2 text-slate-300 py-2 border-b border-slate-700"
                >
                    <Settings className="w-4 h-4" /> Acesso Administrativo
                </button>
             </div>
        )}
      </header>

      {/* --- CATEGORY NAV (Moved Above Banner) --- */}
      <section className="sticky top-16 z-40 bg-indigo-900 text-white shadow-md border-t border-indigo-800">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-visible h-12">
                {/* 'Todos' Button */}
                <button
                    onClick={() => { setSelectedCategory('Todos'); setSelectedSubcategory(null); }}
                    className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                        selectedCategory === 'Todos' 
                        ? 'border-sky-400 text-white bg-white/10' 
                        : 'border-transparent text-indigo-100 hover:text-white hover:bg-white/5'
                    }`}
                >
                   <Filter className="w-4 h-4" />
                   Todos
                </button>
                
                {/* Separator */}
                <div className="w-px h-4 bg-indigo-800 mx-2 hidden sm:block"></div>

                {/* Categories */}
                {categories.map(cat => (
                    <div key={cat.id} className="relative group h-full">
                        <button
                            onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategory(null); }}
                            className={`px-4 h-full flex items-center gap-1 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                                selectedCategory === cat.name
                                ? 'border-sky-400 text-white bg-white/10' 
                                : 'border-transparent text-indigo-100 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {cat.name}
                            {cat.subcategories && cat.subcategories.length > 0 && (
                                <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity mt-0.5" />
                            )}
                        </button>
                        
                        {/* Subcategory Dropdown - Styled like photo */}
                        {cat.subcategories && cat.subcategories.length > 0 && (
                            <div className="hidden group-hover:block absolute left-0 top-full bg-white shadow-xl rounded-b-md py-2 min-w-[200px] z-50 animate-fade-in border-t-2 border-indigo-600">
                                <div className="flex flex-col">
                                    {cat.subcategories.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent bubbling if nested logic changes
                                                setSelectedCategory(cat.name);
                                                setSelectedSubcategory(sub.name);
                                            }}
                                            className={`text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${
                                                selectedCategory === cat.name && selectedSubcategory === sub.name
                                                ? 'text-indigo-600 font-bold bg-indigo-50'
                                                : 'text-slate-600 hover:text-indigo-600'
                                            }`}
                                        >
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
         </div>
      </section>

      {/* --- HERO BANNER --- */}
      <section className="relative w-full h-[300px] md:h-[400px] bg-slate-900 overflow-hidden group">
         {/* Banner Image */}
         {activeBanners.length > 0 && (
             <div className="absolute inset-0">
                 <img 
                    src={resolveImagePath(`banners/${activeBanners[currentBanner].imageUrl}`)} 
                    alt="Banner" 
                    className="w-full h-full object-cover animate-fade-in"
                    key={activeBanners[currentBanner].id} // Force re-render for animation
                 />
                 {/* Optional Dark Overlay if image is missing or for style */}
                 <div className="absolute inset-0 bg-black/10"></div>
             </div>
         )}

         {/* Navigation Arrows */}
         {activeBanners.length > 1 && (
             <>
                 <button 
                    onClick={prevBanner}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                 >
                     <ChevronLeft className="w-6 h-6" />
                 </button>
                 <button 
                    onClick={nextBanner}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-slate-800 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                 >
                     <ChevronRight className="w-6 h-6" />
                 </button>
                 
                 {/* Indicators */}
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                     {activeBanners.map((_, idx) => (
                         <button 
                            key={idx}
                            onClick={() => setCurrentBanner(idx)} 
                            className={`w-2.5 h-2.5 rounded-full transition-all shadow-sm ${currentBanner === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`}
                         ></button>
                     ))}
                 </div>
             </>
         )}
      </section>

      {/* --- PRODUCT SHOWCASE --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-8">
             <div className="flex flex-col">
                 <h2 className="text-2xl font-bold text-slate-900 relative pl-4">
                     <span className="absolute left-0 top-1 bottom-1 w-1 bg-indigo-600 rounded-full"></span>
                     {selectedCategory === 'Todos' ? 'Destaques e Novidades' : `Categoria: ${selectedCategory}`}
                 </h2>
                 {selectedSubcategory && (
                     <span className="text-sm text-indigo-600 font-medium ml-4 mt-1 flex items-center gap-1">
                         <ChevronDown className="w-3 h-3 rotate-[-90deg]" /> {selectedSubcategory}
                     </span>
                 )}
             </div>
             <span className="text-sm text-slate-500 hidden sm:block">
                 Mostrando {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
             </span>
        </div>

        {/* Grid */}
        {loading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {[1,2,3,4].map(i => (
                     <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-slate-200"></div>
                 ))}
             </div>
        ) : filteredProducts.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                 <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                 <h3 className="text-lg font-medium text-slate-600">Nenhum produto encontrado</h3>
                 <p className="text-slate-400 text-sm">
                     Não há produtos nesta categoria/subcategoria no momento.
                 </p>
                 <button 
                    onClick={() => { setSelectedCategory('Todos'); setSelectedSubcategory(null); }}
                    className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
                 >
                     Ver todos os produtos
                 </button>
             </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => handleProductClick(product)}
                      className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
                    >
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                            {product.imageUrl ? (
                                <img src={resolveImagePath(product.imageUrl)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                    <ShoppingBag className="w-10 h-10 opacity-20" />
                                </div>
                            )}
                            {product.highlight && (
                                <span className="absolute top-2 left-2 bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm tracking-wide">
                                    NOVIDADE
                                </span>
                            )}
                            {/* Quick Action Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-slate-900/80 to-transparent flex justify-center pt-8">
                                <button className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-full shadow hover:bg-sky-50 w-full">
                                    Personalizar e Comprar
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex flex-col mb-1">
                                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{product.category || 'Geral'}</span>
                                {product.subcategory && (
                                    <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                        <ChevronDown className="w-2 h-2 -rotate-90" /> {product.subcategory}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1 leading-tight">{product.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{product.description}</p>
                            
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 line-through">R$ {(product.price * 1.2).toFixed(2)}</span>
                                    <span className="text-lg font-bold text-slate-800">R$ {product.price.toFixed(2)}</span>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-600">
                                    <ShoppingBag className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center select-none font-logo text-white mb-4">
                        <span className="text-xl font-bold tracking-tight">PrintMy</span>
                        <span className="text-xl font-bold tracking-tight text-sky-400">[]</span>
                        <span className="text-xl font-bold tracking-tight">3D</span>
                  </div>
                  <p className="text-sm max-w-xs leading-relaxed">
                      Transformamos plástico em arte. Produtos impressos em 3D com design exclusivo e materiais de alta qualidade.
                  </p>
              </div>
              
              <div>
                  <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Categorias</h4>
                  <ul className="space-y-2 text-sm">
                      {categories.map(cat => (
                           <li key={cat.id}><a href="#" className="hover:text-sky-400 transition-colors">{cat.name}</a></li>
                      ))}
                      {categories.length === 0 && <li>Sem categorias cadastradas</li>}
                  </ul>
              </div>

              <div>
                   <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Atendimento</h4>
                   <ul className="space-y-2 text-sm">
                      <li><a href="#" className="hover:text-sky-400 transition-colors">Fale Conosco</a></li>
                      <li><a href="#" className="hover:text-sky-400 transition-colors">Dúvidas Frequentes</a></li>
                      <li><a href="#" className="hover:text-sky-400 transition-colors">Políticas de Envio</a></li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
              &copy; {new Date().getFullYear()} PrintMy[]3D. Todos os direitos reservados.
          </div>
      </footer>
    </div>
  );
};
