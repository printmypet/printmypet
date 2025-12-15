
import React, { useEffect, useState } from 'react';
import { Settings, ShoppingBag, Search, Menu, X, ArrowRight, Filter, ChevronDown } from 'lucide-react';
import { CatalogProduct, Category, Banner } from '../types';
import { fetchCatalogProducts, fetchCategories, fetchBanners } from '../services/supabase';

interface LandingPageProps {
  onEnterProduction: () => void;
  isOnline: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterProduction, isOnline }) => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  useEffect(() => {
    // Carrega os dados sempre que montar, ou quando a conexão online for restabelecida
    loadData();
  }, [isOnline]);

  const loadData = async () => {
    setLoading(true);
    // Se não estiver online, as funções retornarão array vazio, o que é seguro.
    const [prodData, catData, bannerData] = await Promise.all([
        fetchCatalogProducts(),
        fetchCategories(),
        fetchBanners()
    ]);
    
    // Só atualiza se tiver dados ou se estivermos online (para garantir que limpe se falhar)
    if (prodData) setProducts(prodData);
    if (catData) setCategories(catData);
    if (bannerData) setBanners(bannerData);
    
    setLoading(false);
  };

  const getThemeGradient = (theme: string) => {
      switch(theme) {
          case 'purple': return 'from-purple-600 to-pink-600';
          case 'blue': return 'from-indigo-600 to-sky-600';
          default: return 'from-slate-700 to-slate-500';
      }
  };

  const activeBanners = banners.length > 0 ? banners : [
    {
       id: 'default-1',
       title: "Transforme Ideias em Realidade",
       subtitle: "Produtos exclusivos impressos em 3D com a mais alta qualidade.",
       theme: 'blue'
    },
    {
       id: 'default-2',
       title: "Novos Itens de Decoração",
       subtitle: "Modernize seu ambiente com peças geométricas e texturizadas.",
       theme: 'purple'
    }
  ] as Banner[];

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HEADER / TOPBAR --- */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-800 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center select-none font-logo">
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
            <div className="flex items-center gap-1 overflow-x-auto h-12 no-scrollbar">
                {/* 'Todos' Button */}
                <button
                    onClick={() => setSelectedCategory('Todos')}
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
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`group px-4 h-full flex items-center gap-1 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                            selectedCategory === cat.name
                            ? 'border-sky-400 text-white bg-white/10' 
                            : 'border-transparent text-indigo-100 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {cat.name}
                        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </button>
                ))}
            </div>
         </div>
      </section>

      {/* --- HERO BANNER --- */}
      <section className="relative h-[300px] md:h-[400px] bg-slate-900 overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute inset-0">
             <div className={`absolute -top-[50%] -left-[10%] w-[80%] h-[150%] rounded-full bg-gradient-to-br ${getThemeGradient(activeBanners[currentBanner].theme)} opacity-20 blur-[100px] transition-all duration-1000`}></div>
             <div className="absolute top-[20%] -right-[10%] w-[60%] h-[100%] rounded-full bg-indigo-900/30 blur-[80px]"></div>
         </div>

         <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center items-start">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 max-w-2xl leading-tight drop-shadow-lg">
                {activeBanners[currentBanner].title}
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-xl mb-8 font-light">
                {activeBanners[currentBanner].subtitle}
            </p>
            <button className="bg-white text-slate-900 font-bold px-8 py-3 rounded-full hover:bg-sky-50 transition-colors shadow-lg flex items-center gap-2 group">
                Ver Produtos
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>

         {/* Banner Controls */}
         <div className="absolute bottom-4 right-4 flex gap-2 z-20">
             {activeBanners.map((_, idx) => (
                 <button 
                    key={idx}
                    onClick={() => setCurrentBanner(idx)} 
                    className={`w-3 h-3 rounded-full transition-all ${currentBanner === idx ? 'bg-white w-6' : 'bg-white/30'}`}
                 ></button>
             ))}
         </div>
      </section>

      {/* --- PRODUCT SHOWCASE --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-bold text-slate-900 relative pl-4">
                 <span className="absolute left-0 top-1 bottom-1 w-1 bg-indigo-600 rounded-full"></span>
                 {selectedCategory === 'Todos' ? 'Destaques e Novidades' : `Categoria: ${selectedCategory}`}
             </h2>
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
                     Não há produtos nesta categoria no momento.
                 </p>
                 <button 
                    onClick={() => setSelectedCategory('Todos')}
                    className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
                 >
                     Ver todos os produtos
                 </button>
             </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                    <div key={product.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                            {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                                    Ver Detalhes
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-1">{product.category || 'Geral'}</div>
                            <h3 className="font-bold text-slate-900 mb-1 leading-tight">{product.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{product.description}</p>
                            
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 line-through">R$ {(product.price * 1.2).toFixed(2)}</span>
                                    <span className="text-lg font-bold text-slate-800">R$ {product.price.toFixed(2)}</span>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors text-slate-600">
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
