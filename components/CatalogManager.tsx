
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Tag, DollarSign, Image as ImageIcon, Loader2, ShoppingBag, LayoutTemplate, Layers, FolderOpen, ArrowRight, X, Edit2, Check, GripVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { CatalogProduct, Category, Banner } from '../types';
import { 
  addCatalogProduct, 
  updateCatalogProduct,
  deleteCatalogProduct, 
  fetchCatalogProducts,
  fetchCategories,
  addCategory,
  updateCategory,
  updateCategoryPositions,
  deleteCategory,
  fetchBanners,
  addBanner,
  deleteBanner,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory
} from '../services/supabase';

export const CatalogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'banners'>('products');
  
  // Products State
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [addingSubToCategory, setAddingSubToCategory] = useState<string | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  
  // Inline Editing State for Categories/Subcategories
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{id: string, name: string} | null>(null);


  // Banners State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newBannerImage, setNewBannerImage] = useState('');

  const [newItem, setNewItem] = useState<{
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    category: string;
    subcategory: string;
    highlight: boolean;
  }>({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '', 
    subcategory: '',
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
    if (data.length > 0 && !newItem.category && !editingProduct) {
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
      // Salva apenas o nome do arquivo. Como o base="./", o navegador buscará na mesma pasta do index.html (raiz do dist)
      const relativePath = file.name;
      setNewItem(prev => ({ ...prev, imageUrl: relativePath }));
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // Helper para resolver caminho da imagem (remove barra inicial se existir para compatibilidade com base: ./)
  const resolveImagePath = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path.slice(1) : path;
  };

  // --- Price Mask Handler ---
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
        setNewItem({ ...newItem, price: '' });
        return;
    }
    const value = parseInt(rawValue, 10) / 100;
    // Formata para 0.000,00
    const formatted = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setNewItem({ ...newItem, price: formatted });
  };

  // --- Product Handlers ---
  const startEditProduct = (product: CatalogProduct) => {
      setEditingProduct(product);
      setNewItem({
          name: product.name,
          description: product.description || '',
          price: product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          imageUrl: product.imageUrl || '',
          category: product.category,
          subcategory: product.subcategory || '',
          highlight: product.highlight
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditProduct = () => {
      setEditingProduct(null);
      setNewItem({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        category: categories[0]?.name || '',
        subcategory: '',
        highlight: false
      });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    setSubmitting(true);
    try {
      // Limpa a formatação: remove pontos de milhar e troca vírgula por ponto
      const cleanPrice = parseFloat(newItem.price.replace(/\./g, '').replace(',', '.'));

      const payload = {
        name: newItem.name,
        description: newItem.description,
        price: cleanPrice,
        imageUrl: newItem.imageUrl,
        category: newItem.category || (categories[0]?.name || 'Geral'),
        subcategory: newItem.subcategory,
        highlight: newItem.highlight
      };

      if (editingProduct) {
          await updateCatalogProduct({
              ...payload,
              id: editingProduct.id
          });
      } else {
          await addCatalogProduct(payload);
      }
      
      cancelEditProduct();
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

  const handleUpdateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingCategory || !editingCategory.name) return;
      try {
          await updateCategory(editingCategory.id, editingCategory.name);
          setEditingCategory(null);
          loadCategories();
      } catch(e) { alert("Erro ao atualizar categoria"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if(confirm("Excluir categoria e todas as suas subcategorias?")) {
      await deleteCategory(id);
      loadCategories();
    }
  };

  // --- Category Drag & Drop ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === dropIndex) return;
    
    const newCategories = [...categories];
    const [movedCategory] = newCategories.splice(draggedCategoryIndex, 1);
    newCategories.splice(dropIndex, 0, movedCategory);
    
    setCategories(newCategories); // Optimistic update
    setDraggedCategoryIndex(null);
    
    try {
       await updateCategoryPositions(newCategories);
    } catch (err) {
       console.error("Failed to update category positions in DB", err);
       alert("Erro ao salvar ordem das categorias.");
       loadCategories(); // Revert on error
    }
  };

  // --- Subcategory Handlers ---
  const handleAddSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if(!newSubcategoryName) return;
    try {
        await addSubcategory(newSubcategoryName, categoryId);
        setNewSubcategoryName('');
        setAddingSubToCategory(null);
        loadCategories();
    } catch(e) { alert("Erro ao criar subcategoria"); }
  };

  const handleUpdateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingSubcategory || !editingSubcategory.name) return;
    try {
        await updateSubcategory(editingSubcategory.id, editingSubcategory.name);
        setEditingSubcategory(null);
        loadCategories();
    } catch(e) { alert("Erro ao atualizar subcategoria"); }
  };

  const handleDeleteSubcategory = async (id: string) => {
      if(confirm("Excluir subcategoria?")) {
          await deleteSubcategory(id);
          loadCategories();
      }
  };

  // --- Banner Handlers ---
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newBannerImage) return;
    try {
      await addBanner({ imageUrl: newBannerImage });
      setNewBannerImage('');
      loadBanners();
    } catch(e) { alert("Erro ao criar banner"); }
  };

  const handleDeleteBanner = async (id: string) => {
    if(confirm("Excluir banner?")) {
      await deleteBanner(id);
      loadBanners();
    }
  };

  // Derived state for current selected category subcategories
  const currentCategoryObj = categories.find(c => c.name === newItem.category);
  const currentSubcategories = currentCategoryObj?.subcategories || [];


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
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                 {editingProduct ? <Edit2 className="w-4 h-4"/> : <Plus className="w-4 h-4" />}
                 {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </span>
              {editingProduct && (
                  <button onClick={cancelEditProduct} className="text-xs text-red-500 hover:underline">Cancelar Edição</button>
              )}
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
                          inputMode="numeric"
                          value={newItem.price}
                          onChange={handlePriceChange}
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
                          placeholder="nome-do-arquivo.jpg"
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
                              <img src={resolveImagePath(newItem.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                      )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                      * O arquivo deve existir fisicamente na pasta "public" do projeto.
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
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Categoria Principal</label>
                  <select 
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value, subcategory: ''})}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white"
                  >
                      {categories.length === 0 && <option value="">Sem categorias cadastradas</option>}
                      {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                  </select>
              </div>

              <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Subcategoria (Opcional)</label>
                  <select 
                      value={newItem.subcategory}
                      onChange={e => setNewItem({...newItem, subcategory: e.target.value})}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={currentSubcategories.length === 0}
                  >
                      <option value="">{currentSubcategories.length === 0 ? 'Nenhuma subcategoria disponível' : 'Selecione (Opcional)'}</option>
                      {currentSubcategories.map(sub => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                  </select>
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
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : editingProduct ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
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
                  <div key={product.id} className={`bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col ${editingProduct?.id === product.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                      <div className="h-40 bg-slate-100 relative">
                          {product.imageUrl ? (
                              <img src={resolveImagePath(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
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
                          <div className="flex flex-col mb-2">
                              <h5 className="font-bold text-slate-900 leading-tight">{product.name}</h5>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                    {product.category}
                                </span>
                                {product.subcategory && (
                                    <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100 whitespace-nowrap flex items-center gap-1">
                                        <ArrowRight className="w-2 h-2" />
                                        {product.subcategory}
                                    </span>
                                )}
                              </div>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{product.description}</p>
                          <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                              <span className="font-bold text-slate-800 text-lg">R$ {product.price.toFixed(2)}</span>
                              <div className="flex gap-1">
                                  <button 
                                      onClick={() => startEditProduct(product)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                      title="Editar"
                                  >
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Excluir"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
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
                    <Tag className="w-4 h-4" /> Nova Categoria Principal
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
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-800">Categorias & Subcategorias</h4>
                    <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Arraste para ordenar</span>
                 </div>
                 <div className="space-y-4">
                    {categories.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria encontrada.</p>}
                    {categories.map((cat, index) => (
                        <div 
                            key={cat.id} 
                            className={`bg-slate-50 rounded-lg border p-3 transition-all ${draggedCategoryIndex === index ? 'opacity-50 border-dashed border-indigo-400' : 'border-slate-100 hover:border-indigo-200'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                    {editingCategory?.id === cat.id ? (
                                        <form onSubmit={handleUpdateCategory} className="flex items-center gap-2 flex-1 mr-2">
                                            <input 
                                                type="text" 
                                                value={editingCategory.name}
                                                onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                                                className="flex-1 text-sm p-1 rounded border border-indigo-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                autoFocus
                                            />
                                            <button type="submit" className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-4 h-4"/></button>
                                            <button type="button" onClick={() => setEditingCategory(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-4 h-4"/></button>
                                        </form>
                                    ) : (
                                        <span className="font-bold text-slate-800">{cat.name}</span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {!editingCategory && (
                                        <>
                                            <button 
                                                onClick={() => setAddingSubToCategory(cat.id)}
                                                className="text-indigo-500 hover:text-indigo-700 text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200"
                                            >
                                                + Sub
                                            </button>
                                            <button 
                                                onClick={() => setEditingCategory({id: cat.id, name: cat.name})}
                                                className="text-slate-400 hover:text-indigo-500"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Subcategories List */}
                            <div className="pl-4 space-y-1 border-l-2 border-slate-200 ml-1">
                                {cat.subcategories && cat.subcategories.length > 0 ? (
                                    cat.subcategories.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between text-sm group h-8">
                                            {editingSubcategory?.id === sub.id ? (
                                                <form onSubmit={handleUpdateSubcategory} className="flex items-center gap-2 flex-1">
                                                     <input 
                                                        type="text" 
                                                        value={editingSubcategory.name}
                                                        onChange={e => setEditingSubcategory({...editingSubcategory, name: e.target.value})}
                                                        className="flex-1 text-xs p-1 rounded border border-indigo-300 bg-white"
                                                        autoFocus
                                                    />
                                                    <button type="submit" className="text-green-600"><Check className="w-3 h-3"/></button>
                                                    <button type="button" onClick={() => setEditingSubcategory(null)} className="text-red-500"><X className="w-3 h-3"/></button>
                                                </form>
                                            ) : (
                                                <>
                                                    <span className="text-slate-600">{sub.name}</span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setEditingSubcategory({id: sub.id, name: sub.name})}
                                                            className="text-slate-300 hover:text-indigo-500"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteSubcategory(sub.id)}
                                                            className="text-slate-300 hover:text-red-400"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Sem subcategorias</p>
                                )}
                                
                                {/* Add Sub Form (Inline) */}
                                {addingSubToCategory === cat.id && (
                                    <form onSubmit={(e) => handleAddSubcategory(e, cat.id)} className="flex gap-2 mt-2">
                                        <input 
                                            type="text"
                                            value={newSubcategoryName}
                                            onChange={e => setNewSubcategoryName(e.target.value)}
                                            placeholder="Nome da sub..."
                                            className="w-full text-xs p-1 rounded border border-slate-300 bg-white"
                                            autoFocus
                                        />
                                        <button type="submit" className="text-green-600 bg-green-50 p-1 rounded border border-green-200">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button type="button" onClick={() => setAddingSubToCategory(null)} className="text-slate-400 bg-white p-1 rounded border border-slate-200">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </form>
                                )}
                            </div>
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
                    <LayoutTemplate className="w-4 h-4" /> Novo Banner (Imagem)
                </h4>
                <form onSubmit={handleAddBanner} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Nome do Arquivo</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">banners/</span>
                            <input 
                               type="text"
                               value={newBannerImage}
                               onChange={e => setNewBannerImage(e.target.value)}
                               className="w-full rounded-lg border-slate-300 border p-2 pl-20 text-sm bg-white"
                               placeholder="promo-natal.png"
                               required
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">A imagem deve estar na pasta "public/banners" do projeto.</p>
                    </div>
                    <div className="w-32">
                        <Button type="submit" className="w-full">Adicionar</Button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-4">
                 {banners.map(banner => (
                     <div key={banner.id} className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-700 h-32 group">
                         <img 
                            src={resolveImagePath(`banners/${banner.imageUrl}`)} 
                            alt="Banner Preview" 
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                         />
                         
                         <div className="absolute inset-0 flex items-center justify-between p-6 pointer-events-none">
                             <div className="z-10 bg-black/50 p-2 rounded text-white">
                                 <p className="text-xs font-mono">banners/{banner.imageUrl}</p>
                             </div>

                             <button 
                                onClick={() => handleDeleteBanner(banner.id)} 
                                className="pointer-events-auto z-10 p-2 bg-slate-800/80 hover:bg-red-900/90 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-600 backdrop-blur-sm"
                             >
                                 <Trash2 className="w-5 h-5" />
                             </button>
                         </div>
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
