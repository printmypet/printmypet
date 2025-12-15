
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Tag, DollarSign, Image as ImageIcon, Loader2, ShoppingBag, LayoutTemplate, Layers, FolderOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { CatalogProduct, Category, Banner } from '../types';
import { 
  addCatalogProduct, 
  deleteCatalogProduct, 
  fetchCatalogProducts,
  fetchCategories,
  addCategory,
  deleteCategory,
  fetchBanners,
  addBanner,
  deleteBanner
} from '../services/supabase';

export const CatalogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'banners'>('products');
  
  // Products State
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Banners State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newBanner, setNewBanner] = useState<{title: string, subtitle: string, theme: 'blue' | 'purple' | 'dark'}>({
    title: '',
    subtitle: '',
    theme: 'blue'
  });

  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    category: string;
    highlight: boolean;
  }>({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '', // Start empty
    highlight: false
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadCategories(), loadBanners()]);
    setLoading(false);
  };

  const loadProducts = async () => {
    const data = await fetchCatalogProducts();
    setProducts(data);
  };

  const loadCategories = async () => {
    const data = await fetchCategories();
    setCategories(data);
    // Set default category if available and not set
    if (data.length > 0 && !newItem.category) {
       setNewItem(prev => ({ ...prev, category: data[0].name }));
    }
  };

  const loadBanners = async () => {
    const data = await fetchBanners();
    setBanners(data);
  };

  // --- File Browser Handler ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Assume o arquivo está na raiz da pasta public
      // Se estiver em uma subpasta (ex: /img/), o usuário pode editar o texto depois
      const relativePath = `/${file.name}`;
      setNewItem(prev => ({ ...prev, imageUrl: relativePath }));
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // --- Product Handlers ---
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    setSubmitting(true);
    try {
      await addCatalogProduct({
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price.replace(',', '.')),
        imageUrl: newItem.imageUrl,
        category: newItem.category || (categories[0]?.name || 'Geral'),
        highlight: newItem.highlight
      });
      
      setNewItem({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        category: categories[0]?.name || '',
        highlight: false
      });
      
      await loadProducts();
    } catch (error) {
      alert("Erro ao salvar produto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Remover este produto do catálogo?")) {
      await deleteCatalogProduct(id);
      loadProducts();
    }
  };

  // --- Category Handlers ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newCategoryName) return;
    try {
      await addCategory(newCategoryName);
      setNewCategoryName('');
      loadCategories();
    } catch(e) { alert("Erro ao criar categoria"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if(confirm("Excluir categoria?")) {
      await deleteCategory(id);
      loadCategories();
    }
  };

  // --- Banner Handlers ---
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newBanner.title) return;
    try {
      await addBanner(newBanner);
      setNewBanner({ title: '', subtitle: '', theme: 'blue' });
      loadBanners();
    } catch(e) { alert("Erro ao criar banner"); }
  };

  const handleDeleteBanner = async (id: string) => {
    if(confirm("Excluir banner?")) {
      await deleteBanner(id);
      loadBanners();
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                <ShoppingBag className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-900">Gerenciador da Loja</h3>
                <p className="text-sm text-slate-500">Configure produtos, banners e categorias da vitrine.</p>
             </div>
         </div>
         
         <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
               onClick={() => setActiveTab('products')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'products' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
             >
               Produtos
             </button>
             <button 
               onClick={() => setActiveTab('categories')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'categories' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
             >
               Categorias
             </button>
             <button 
               onClick={() => setActiveTab('banners')}
               className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'banners' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
             >
               Banners
             </button>
         </div>
      </div>

      {activeTab === 'products' && (
      <>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Produto
          </h4>
          <form onSubmit={handleSubmitProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Nome do Produto</label>
                  <input 
                      type="text" 
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                      placeholder="Ex: Vaso Geométrico"
                      required
                  />
              </div>
              <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Preço (R$)</label>
                  <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                          type="text" 
                          value={newItem.price}
                          onChange={e => setNewItem({...newItem, price: e.target.value})}
                          className="w-full rounded-lg border-slate-300 border p-2 pl-8 text-sm bg-white"
                          placeholder="0,00"
                          required
                      />
                  </div>
              </div>
              <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Imagem (da pasta public)</label>
                  <div className="flex gap-2">
                      <input 
                          type="text" 
                          value={newItem.imageUrl}
                          onChange={e => setNewItem({...newItem, imageUrl: e.target.value})}
                          className="flex-1 rounded-lg border-slate-300 border p-2 text-sm bg-white"
                          placeholder="/nome-do-arquivo.jpg"
                      />
                      <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*"
                      />
                      <Button type="button" variant="secondary" onClick={triggerFileBrowser} title="Buscar arquivo na pasta local">
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Buscar
                      </Button>
                      {newItem.imageUrl && (
                          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                              <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                      )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                      * O arquivo deve existir fisicamente na pasta "public" do servidor.
                  </p>
              </div>
              <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Descrição Curta</label>
                  <input 
                      type="text" 
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                      placeholder="Breve descrição do item..."
                  />
              </div>
              <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Categoria</label>
                  <select 
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                  >
                      {categories.length === 0 && <option value="">Sem categorias cadastradas</option>}
                      {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                  </select>
                  {categories.length === 0 && (
                      <p className="text-[10px] text-red-500 mt-1">Cadastre categorias na aba "Categorias" primeiro.</p>
                  )}
              </div>
              <div className="md:col-span-1 flex items-end">
                  <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg w-full cursor-pointer hover:bg-slate-50">
                      <input 
                          type="checkbox"
                          checked={newItem.highlight}
                          onChange={e => setNewItem({...newItem, highlight: e.target.checked})}
                          className="w-4 h-4 text-indigo-600 rounded bg-white"
                      />
                      <span className="text-sm text-slate-700">Destaque na Home</span>
                  </label>
              </div>
              <div className="md:col-span-2">
                  <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Cadastrar Produto
                  </Button>
              </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
              <div className="col-span-full text-center py-8 text-slate-400">Carregando catálogo...</div>
          ) : products.length === 0 ? (
              <div className="col-span-full text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                  Nenhum produto cadastrado.
              </div>
          ) : (
              products.map(product => (
                  <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                      <div className="h-40 bg-slate-100 relative">
                          {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <ImageIcon className="w-8 h-8" />
                              </div>
                          )}
                          {product.highlight && (
                              <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                  DESTAQUE
                              </span>
                          )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-slate-900 leading-tight">{product.name}</h5>
                              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 whitespace-nowrap ml-2">
                                  {product.category}
                              </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{product.description}</p>
                          <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                              <span className="font-bold text-slate-800 text-lg">R$ {product.price.toFixed(2)}</span>
                              <button 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  </div>
              ))
          )}
        </div>
      </>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Nova Categoria
                </h4>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input 
                       type="text" 
                       value={newCategoryName}
                       onChange={e => setNewCategoryName(e.target.value)}
                       placeholder="Ex: Decoração, Pets..."
                       className="flex-1 rounded-lg border-slate-300 border p-2 text-sm bg-white"
                       required
                    />
                    <Button type="submit" size="sm">
                        <Plus className="w-4 h-4" />
                    </Button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h4 className="font-semibold text-slate-800 mb-4">Categorias Ativas ({categories.length})</h4>
                 <div className="space-y-2">
                    {categories.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria encontrada.</p>}
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <span className="font-medium text-slate-700">{cat.name}</span>
                             <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" /> Novo Banner
                </h4>
                <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Título</label>
                        <input 
                           type="text"
                           value={newBanner.title}
                           onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                           required
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Subtítulo</label>
                        <input 
                           type="text"
                           value={newBanner.subtitle}
                           onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tema (Cor)</label>
                        <select
                           value={newBanner.theme}
                           onChange={e => setNewBanner({...newBanner, theme: e.target.value as any})}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                        >
                            <option value="blue">Azul / Indigo</option>
                            <option value="purple">Roxo / Rosa</option>
                            <option value="dark">Escuro / Slate</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <Button type="submit" className="w-full">Adicionar</Button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-4">
                 {banners.map(banner => (
                     <div key={banner.id} className="relative overflow-hidden rounded-xl bg-slate-900 p-6 flex items-center justify-between border border-slate-700">
                         {/* Visual Preview Background */}
                         <div className="absolute inset-0 pointer-events-none opacity-50">
                             <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl ${banner.theme === 'purple' ? 'bg-purple-600' : banner.theme === 'blue' ? 'bg-indigo-600' : 'bg-slate-600'}`}></div>
                         </div>
                         
                         <div className="relative z-10">
                             <h3 className="text-xl font-bold text-white">{banner.title}</h3>
                             <p className="text-slate-300">{banner.subtitle}</p>
                             <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-0.5 rounded mt-2 inline-block">Tema: {banner.theme}</span>
                         </div>

                         <button onClick={() => handleDeleteBanner(banner.id)} className="relative z-10 p-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700">
                             <Trash2 className="w-5 h-5" />
                         </button>
                     </div>
                 ))}
                 {banners.length === 0 && (
                     <p className="text-center text-slate-500 py-8">Nenhum banner cadastrado.</p>
                 )}
            </div>
        </div>
      )}
    </div>
  );
};
