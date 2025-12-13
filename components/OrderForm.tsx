
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Save, User, Box, Layers, Palette, DollarSign, ShoppingCart, Trash2, Users, Truck, Loader2, Search, ImageOff } from 'lucide-react';
import { 
  ColorOption,
  Order, 
  Customer, 
  ProductConfig,
  PartsColors
} from '../types';
import { Button } from './ui/Button';
import { fetchCustomerByCpf } from '../services/supabase';

interface OrderFormProps {
  partsColors: PartsColors;
  availableTextures: string[];
  onSave: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
  initialOrder?: Order | null;
}

export const OrderForm: React.FC<OrderFormProps> = ({ 
  partsColors, 
  availableTextures, 
  onSave, 
  onCancel,
  initialOrder
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  
  // List of added products for the order
  const [cartItems, setCartItems] = useState<ProductConfig[]>(initialOrder?.products || []);

  // Current product being configured
  const [currentProduct, setCurrentProduct] = useState<ProductConfig>({
    id: uuidv4(),
    part1Color: partsColors.base[0]?.hex || '#000000',
    part2Color: partsColors.ball[0]?.hex || '#000000',
    part3Color: partsColors.top[0]?.hex || '#000000',
    textureType: 'cadastrada',
    textureValue: availableTextures[0] || '',
    dogName: '',
    observations: ''
  });

  // State to control visibility of dog name input
  const [showDogNameInput, setShowDogNameInput] = useState(false);
  const [isSearchingCpf, setIsSearchingCpf] = useState(false);

  // Price handling
  const [productsPriceRaw, setProductsPriceRaw] = useState<number>(0); 
  const [productsPriceDisplay, setProductsPriceDisplay] = useState<string>(''); 
  
  const [shippingPriceRaw, setShippingPriceRaw] = useState<number>(0); 
  const [shippingPriceDisplay, setShippingPriceDisplay] = useState<string>(''); 

  const [isPaid, setIsPaid] = useState<boolean>(initialOrder?.isPaid || false);

  // Customer State
  const [customer, setCustomer] = useState<Omit<Customer, 'address'>>({
    name: '',
    type: 'final',
    partnerName: '',
    email: '',
    phone: '',
    cpf: '',
    instagram: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialOrder) {
      // 1. Products already set in useState init
      
      // 2. Customer
      setCustomer({
        id: initialOrder.customer.id,
        name: initialOrder.customer.name,
        type: initialOrder.customer.type || 'final',
        partnerName: initialOrder.customer.partnerName || '',
        email: initialOrder.customer.email || '',
        phone: initialOrder.customer.phone || '',
        cpf: initialOrder.customer.cpf || '',
        instagram: initialOrder.customer.instagram || '',
        zipCode: initialOrder.customer.zipCode || '',
        street: initialOrder.customer.street || '',
        number: initialOrder.customer.number || '',
        complement: initialOrder.customer.complement || '',
        neighborhood: initialOrder.customer.neighborhood || '',
        city: initialOrder.customer.city || '',
        state: initialOrder.customer.state || ''
      });

      // 3. Finance
      const total = initialOrder.price || 0;
      const shipping = initialOrder.shippingCost || 0;
      const products = Math.max(0, total - shipping);

      // Set Raw (in cents if your logic uses cents, or standard float)
      // The state logic uses cents (int), assuming input logic multiplies by 100 for display? 
      // Let's align: currently inputs parse int/100. So we store CENTS.
      const shippingCents = Math.round(shipping * 100);
      const productsCents = Math.round(products * 100);

      setShippingPriceRaw(shippingCents);
      setProductsPriceRaw(productsCents);
      
      setShippingPriceDisplay(shipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      setProductsPriceDisplay(products.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      
      setIsPaid(initialOrder.isPaid);
    }
  }, [initialOrder]);

  // --- Handlers ---

  const handleProductChange = (key: keyof ProductConfig, value: string) => {
    setCurrentProduct(prev => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = () => {
    setCartItems(prev => [...prev, currentProduct]);
    
    // Reset form for next item
    setCurrentProduct({
        id: uuidv4(),
        part1Color: partsColors.base[0]?.hex || '#000000',
        part2Color: partsColors.ball[0]?.hex || '#000000',
        part3Color: partsColors.top[0]?.hex || '#000000',
        textureType: 'cadastrada',
        textureValue: availableTextures[0] || '',
        dogName: '',
        observations: ''
    });
    setShowDogNameInput(false);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };

  // Phone Mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 9)}-${value.slice(9)}`;
    } 
    setCustomer(prev => ({ ...prev, phone: value }));
  };

  // CEP Mask (00.000-000)
  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8); 
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
    setCustomer(prev => ({ ...prev, zipCode: value }));
  };

  // CPF Mask and Auto-Fetch
  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    setCustomer(prev => ({ ...prev, cpf: value }));

    if (value.length === 14 && !initialOrder) { // Only fetch on new orders to avoid overwriting edits
      setIsSearchingCpf(true);
      try {
        const foundCustomer = await fetchCustomerByCpf(value);
        if (foundCustomer) {
          setCustomer(prev => ({
            ...prev,
            ...foundCustomer,
            cpf: value 
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingCpf(false);
      }
    }
  };

  // Currency Handlers
  const handleProductsPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); 
    const cents = parseInt(value, 10) || 0;
    setProductsPriceRaw(cents);

    const formatted = (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    setProductsPriceDisplay(formatted);
  };

  const handleShippingPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const cents = parseInt(value, 10) || 0;
    setShippingPriceRaw(cents);

    const formatted = (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    setShippingPriceDisplay(formatted);
  };

  // Calculate Total
  const totalRaw = productsPriceRaw + shippingPriceRaw;
  const totalDisplay = (totalRaw / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct full address string cleanly
    const addressParts = [
      customer.street ? `${customer.street}` : '',
      customer.number ? `${customer.number}` : '',
      customer.complement ? `${customer.complement}` : '',
      customer.neighborhood ? `- ${customer.neighborhood}` : '',
      customer.city ? `- ${customer.city}` : '',
      customer.state ? `- ${customer.state}` : '',
      customer.zipCode ? `(${customer.zipCode})` : ''
    ];
    
    const fullAddress = addressParts
      .filter(part => part.trim() !== '' && part.trim() !== '-')
      .join(', ')
      .replace(/, -/g, ' -'); 

    onSave({ 
      customer: {
        ...customer,
        address: fullAddress || 'Endereço não informado'
      },
      products: cartItems, 
      price: totalRaw / 100, 
      shippingCost: shippingPriceRaw / 100, 
      isPaid
    });
  };

  // Helper to render color picker circles
  const ColorPicker = ({ selected, onChange, label, options }: { selected: string, onChange: (c: string) => void, label: string, options: ColorOption[] }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(color => (
          <button
            key={color.hex}
            type="button"
            onClick={() => onChange(color.hex)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${selected === color.hex ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'}`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
            aria-label={color.name}
          />
        ))}
      </div>
      {options.length === 0 && <p className="text-xs text-red-500">Nenhuma cor cadastrada para esta parte.</p>}
    </div>
  );

  // Helper to get SVG Pattern
  const getTexturePattern = (textureName: string) => {
    const name = textureName.toLowerCase();
    const color = "rgba(0,0,0,0.4)"; 

    if (name.includes('hexagonal')) {
      return (
        <pattern id="hex" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
             <path d="M10 0 L18.66 5 L18.66 15 L10 20 L1.34 15 L1.34 5 Z" fill="none" stroke={color} strokeWidth="1" />
        </pattern>
      );
    } 
    else if (name.includes('listrado')) {
      return (
        <pattern id="stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
             <line x1="0" y1="0" x2="0" y2="10" stroke={color} strokeWidth="4" />
        </pattern>
      );
    }
    else if (name.includes('pontilhado')) {
      return (
          <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
             <circle cx="5" cy="5" r="2" fill={color} />
          </pattern>
      );
    }
    else if (name.includes('voronoi')) {
      return (
          <pattern id="voronoi" width="30" height="30" patternUnits="userSpaceOnUse">
             <path d="M0 0 L10 10 L25 5 L30 15 L20 25 L5 20 Z" fill="none" stroke={color} strokeWidth="1.5" />
             <path d="M30 0 L20 10 M10 30 L15 20" stroke={color} strokeWidth="1.5" />
          </pattern>
      );
    }
    else {
      return (
          <pattern id="paws" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="10" cy="10" r="3" fill={color}/>
            <circle cx="6" cy="6" r="1.5" fill={color}/>
            <circle cx="14" cy="6" r="1.5" fill={color}/>
            <circle cx="10" cy="4" r="1.5" fill={color}/>
          </pattern>
      );
    }
  };

  const getPatternId = (textureName: string) => {
    const name = textureName.toLowerCase();
    if (name.includes('hexagonal')) return 'url(#hex)';
    if (name.includes('listrado')) return 'url(#stripes)';
    if (name.includes('pontilhado')) return 'url(#dots)';
    if (name.includes('voronoi')) return 'url(#voronoi)';
    return 'url(#paws)';
  };

  // Helper for rendering a 3D part with dynamic color
  const PartRenderer = ({ 
    imageSrc, 
    color, 
    zIndex, 
    className, 
    texturePattern = null,
    label 
  }: { 
    imageSrc: string, 
    color: string, 
    zIndex: number, 
    className?: string, 
    texturePattern?: string | null,
    label?: string
  }) => {
    const [hasError, setHasError] = useState(false);

    // --- SVG Replacement Logic for known parts to avoid 404s ---
    
    if (imageSrc.includes('base')) {
        return (
          <div className={`relative flex justify-center items-center ${className}`} style={{ zIndex }}>
              <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-sm filter saturate-150">
                  <defs>{texturePattern && getTexturePattern(texturePattern)}</defs>
                  
                  {/* Cylinder Body (Widened from 20 to 10 on sides for beefier look) */}
                  <path d="M10,20 L10,60 Q100,90 190,60 L190,20 Q100,50 10,20 Z" fill={color} />
                  {/* Top Surface (Widened ellipse) */}
                  <ellipse cx="100" cy="20" rx="90" ry="15" fill={color} filter="brightness(1.1)"/>
                  
                  {/* Texture Overlay */}
                  {texturePattern && (
                      <path d="M10,20 L10,60 Q100,90 190,60 L190,20 Q100,50 10,20 Z" fill={getPatternId(texturePattern)} opacity="0.2" />
                  )}
              </svg>
              {label && <span className="absolute text-[10px] font-bold text-slate-400/50 uppercase select-none bottom-0 translate-y-full">{label}</span>}
          </div>
        );
    }

    if (imageSrc.includes('ball')) {
        return (
          <div className={`relative flex justify-center items-center ${className}`} style={{ zIndex }}>
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  <defs>
                      {texturePattern && getTexturePattern(texturePattern)}
                      <radialGradient id="sphereGrad" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="black" stopOpacity="0.2" />
                      </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="48" fill={color} />
                  <circle cx="50" cy="50" r="48" fill="url(#sphereGrad)" />
                  {texturePattern && <circle cx="50" cy="50" r="48" fill={getPatternId(texturePattern)} opacity="0.2" />}
              </svg>
              {label && <span className="absolute text-[10px] font-bold text-slate-400/50 uppercase select-none bottom-0 translate-y-full">{label}</span>}
          </div>
        );
    }

    if (imageSrc.includes('top')) {
        return (
          <div className={`relative flex justify-center items-center ${className}`} style={{ zIndex }}>
              <svg viewBox="0 0 140 70" className="w-full h-full drop-shadow-sm">
                  <defs>{texturePattern && getTexturePattern(texturePattern)}</defs>
                  {/* Cap Shape */}
                  <path d="M20,40 Q70,10 120,40 L120,50 Q70,80 20,50 Z" fill={color} />
                  <path d="M20,40 Q70,10 120,40" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
                  {texturePattern && <path d="M20,40 Q70,10 120,40 L120,50 Q70,80 20,50 Z" fill={getPatternId(texturePattern)} opacity="0.2" />}
              </svg>
              {label && <span className="absolute text-[10px] font-bold text-slate-400/50 uppercase select-none bottom-0 translate-y-full">{label}</span>}
          </div>
        );
    }

    // --- End SVG Replacement ---

    // Fallback for custom images if added later
    const resolvedSrc = (() => {
        const cleanPath = imageSrc.startsWith('/') ? imageSrc.slice(1) : imageSrc;
        return `./${cleanPath}`; 
    })();

    return (
      <div className={`relative flex justify-center items-center ${className}`} style={{ zIndex }}>
        {!hasError ? (
          <>
            <div 
              className="absolute inset-0 w-full h-full bg-current transition-colors duration-300"
              style={{ 
                backgroundColor: color,
                maskImage: `url(${resolvedSrc})`,
                WebkitMaskImage: `url(${resolvedSrc})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center'
              }}
            />

            {texturePattern && texturePattern !== 'Liso' && (
              <div 
              className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
              style={{ 
                maskImage: `url(${resolvedSrc})`,
                WebkitMaskImage: `url(${resolvedSrc})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center'
              }}
            >
                <svg width="100%" height="100%">
                  <defs>{getTexturePattern(texturePattern)}</defs>
                  <rect width="100%" height="100%" fill={getPatternId(texturePattern)} />
                </svg>
            </div>
            )}

            <img 
              src={resolvedSrc} 
              alt="Part" 
              className="relative w-full h-full object-contain mix-blend-multiply opacity-80 pointer-events-none" 
              onError={(e) => {
                 setHasError(true);
              }}
            />
          </>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-red-300 rounded flex flex-col items-center justify-center bg-red-50 p-2 text-center">
             <ImageOff className="w-4 h-4 text-red-400 mb-1" />
             <span className="text-[8px] text-red-400 font-mono leading-tight">Faltando:<br/>{imageSrc}</span>
          </div>
        )}
        
        {label && <span className="absolute text-[10px] font-bold text-slate-400/50 uppercase select-none bottom-0 translate-y-full">{label}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          {step === 1 ? <Box className="w-5 h-5 text-indigo-600"/> : <User className="w-5 h-5 text-indigo-600"/>}
          {step === 1 ? 'Configuração do Produto' : 'Dados do Cliente e Pagamento'}
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button 
            type="button"
            onClick={() => setStep(1)}
            className={`px-2 py-1 rounded transition-colors ${step === 1 ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-100 cursor-pointer'}`}
          >
            Passo 1
          </button>
          <span className="text-slate-300">/</span>
          <button 
            type="button"
            onClick={() => setStep(2)}
            className={`px-2 py-1 rounded transition-colors ${step === 2 ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-100 cursor-pointer'}`}
          >
            Passo 2
          </button>
        </div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-8">
            {/* Added Items List (Cart) */}
            {cartItems.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4"/> Itens no Pedido ({cartItems.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cartItems.map((item, index) => (
                            <div key={item.id} className="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-4 h-4 rounded-full border border-slate-200" style={{backgroundColor: item.part1Color}} title="Base"></div>
                                        <div className="w-4 h-4 rounded-full border border-slate-200" style={{backgroundColor: item.part2Color}} title="Bola"></div>
                                        <div className="w-4 h-4 rounded-full border border-slate-200" style={{backgroundColor: item.part3Color}} title="Topo"></div>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium text-slate-900 block">Item #{index + 1} {item.dogName ? `- ${item.dogName}` : ''}</span>
                                        <span className="text-xs text-slate-500">{item.textureValue}</span>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveFromCart(item.id)}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                    title="Remover item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {/* Configuration Form */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Plus className="w-5 h-5 text-indigo-600"/>
                    <h3 className="font-medium text-slate-900">Configurar Novo Item</h3>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Cores das Partes</h4>
                  <ColorPicker 
                    label="Parte 3 (Detalhes/Topo)" 
                    options={partsColors.top}
                    selected={currentProduct.part3Color} 
                    onChange={(c) => handleProductChange('part3Color', c)} 
                  />
                  <ColorPicker 
                    label="Parte 2 (Bola)" 
                    options={partsColors.ball}
                    selected={currentProduct.part2Color} 
                    onChange={(c) => handleProductChange('part2Color', c)} 
                  />
                  <ColorPicker 
                    label="Parte 1 (Base)" 
                    options={partsColors.base}
                    selected={currentProduct.part1Color} 
                    onChange={(c) => handleProductChange('part1Color', c)} 
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Detalhes</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Textura (Parte 3)</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="textureType"
                          checked={currentProduct.textureType === 'cadastrada'}
                          onChange={() => handleProductChange('textureType', 'cadastrada')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Padrão</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="textureType"
                          checked={currentProduct.textureType === 'personalizada'}
                          onChange={() => {
                            handleProductChange('textureType', 'personalizada');
                            handleProductChange('textureValue', '');
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Personalizada</span>
                      </label>
                    </div>
                  </div>

                  <div className="mb-4">
                    {currentProduct.textureType === 'cadastrada' ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Selecione a Textura</label>
                        <select 
                          className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          value={currentProduct.textureValue}
                          onChange={(e) => handleProductChange('textureValue', e.target.value)}
                        >
                          {availableTextures.length === 0 && <option value="">Nenhuma textura cadastrada</option>}
                          {availableTextures.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descreva a Textura</label>
                        <input 
                          type="text"
                          className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          placeholder="Ex: Escamas de dragão, Floral..."
                          value={currentProduct.textureValue}
                          onChange={(e) => handleProductChange('textureValue', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-4 mb-2">
                      <label className="block text-sm font-medium text-slate-700 mb-0">Gravar nome do cachorrinho?</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newState = !showDogNameInput;
                          setShowDogNameInput(newState);
                          if (!newState) {
                            handleProductChange('dogName', '');
                          }
                        }}
                        className={`px-4 py-1 rounded-full text-xs font-bold transition-all border ${
                          showDogNameInput 
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' 
                            : 'bg-white text-slate-400 border-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        SIM
                      </button>
                    </div>
                    
                    {showDogNameInput && (
                      <input 
                        type="text"
                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white animate-fade-in"
                        placeholder="Nome para gravar na peça"
                        value={currentProduct.dogName}
                        onChange={(e) => handleProductChange('dogName', e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações do Item</label>
                    <textarea 
                      rows={2}
                      className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                      placeholder="Ex: Detalhes específicos..."
                      value={currentProduct.observations}
                      onChange={(e) => handleProductChange('observations', e.target.value)}
                    />
                  </div>
                  
                  <div className="mt-6">
                      <Button 
                        type="button" 
                        onClick={handleAddToCart}
                        className="w-full justify-center shadow-md hover:shadow-lg transform transition-all active:scale-95"
                      >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Item ao Pedido
                      </Button>
                  </div>
                </div>
              </div>

              {/* Visualizer */}
              <div className="bg-white rounded-xl p-8 flex flex-col items-center justify-start border border-slate-200 sticky top-4 h-fit min-h-[400px]">
                <h4 className="text-slate-500 font-medium mb-12 uppercase tracking-wider text-sm">Visualização do Item Atual</h4>
                <div className="relative flex flex-col items-center">
                  
                  {/* Part 3 (Top) - Image Based */}
                  <PartRenderer 
                    imageSrc="top.png"
                    color={currentProduct.part3Color}
                    zIndex={30}
                    className="w-40 h-24 mb-[-12px]"
                    texturePattern={currentProduct.textureValue}
                    label="TAMPA"
                  />
                  
                  {/* Part 2 (Ball) - Image Based */}
                  <PartRenderer 
                    imageSrc="ball.png"
                    color={currentProduct.part2Color}
                    zIndex={20}
                    className="w-20 h-20 mb-[-15px]" 
                    label="BOLA"
                  />

                  {/* Part 1 (Base) - Image Based */}
                  <PartRenderer 
                    imageSrc="base.png"
                    color={currentProduct.part1Color}
                    zIndex={10}
                    className="w-72 h-24"
                    label="BASE"
                  />
                </div>
                
                <div className="mt-12 flex flex-col gap-1 items-center">
                  <p className="text-xs text-slate-400 text-center max-w-xs">
                    * Simulação visual com base nas cores selecionadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
               <DollarSign className="w-5 h-5 text-green-600" />
               <h3 className="text-lg font-medium text-slate-900">Financeiro ({cartItems.length} itens no pedido)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2 mb-2">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor dos Produtos</label>
                    <input 
                        type="text"
                        inputMode="numeric"
                        value={productsPriceDisplay}
                        onChange={handleProductsPriceChange}
                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
                        placeholder="R$ 0,00"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Frete</label>
                    <input 
                        type="text"
                        inputMode="numeric"
                        value={shippingPriceDisplay}
                        onChange={handleShippingPriceChange}
                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
                        placeholder="R$ 0,00"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (Automático)</label>
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 font-bold text-lg text-slate-900 flex items-center justify-between">
                         <span>{totalDisplay}</span>
                         {totalRaw > 0 && <span className="text-xs font-normal text-slate-500">Calculado</span>}
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 flex items-end pb-4 border-b border-slate-100 mb-2">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg w-full bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors h-[46px]">
                <input 
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <span className="font-medium text-slate-900">Pedido já foi Pago?</span>
              </label>
            </div>

            <div className="md:col-span-2 mt-2 flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
               <User className="w-5 h-5 text-indigo-600" />
               <h3 className="text-lg font-medium text-slate-900">Informações de Contato</h3>
            </div>

            <div className="md:col-span-1 relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
              <div className="relative">
                <input 
                  type="text"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={customer.cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="w-full rounded-lg border-slate-300 border p-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  {isSearchingCpf ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Digite o CPF para buscar cadastro automaticamente.
              </p>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo do Cliente *</label>
              <input 
                type="text"
                name="name"
                required
                value={customer.name}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
            
            <div className="md:col-span-2 mb-2 mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Cliente</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex-1">
                  <input 
                    type="radio" 
                    name="type"
                    value="final"
                    checked={customer.type === 'final'}
                    onChange={handleCustomerChange}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Cliente Final</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 flex-1">
                  <input 
                    type="radio" 
                    name="type"
                    value="partner"
                    checked={customer.type === 'partner'}
                    onChange={handleCustomerChange}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                     <Users className="w-4 h-4 text-slate-500" />
                     <span>Parceiro</span>
                  </div>
                </label>
              </div>
            </div>

            {customer.type === 'partner' && (
              <div className="md:col-span-2 animate-fade-in bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-2">
                <label className="block text-sm font-medium text-indigo-900 mb-1">Nome da Loja / Parceiro</label>
                <input 
                  type="text"
                  name="partnerName"
                  value={customer.partnerName || ''}
                  onChange={handleCustomerChange}
                  placeholder="Ex: PetShop AuAu"
                  className="w-full rounded-lg border-indigo-200 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            )}

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input 
                type="email"
                name="email"
                value={customer.email}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
              <input 
                type="tel"
                name="phone"
                placeholder="(00) 00000-0000"
                value={customer.phone}
                onChange={handlePhoneChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                maxLength={15}
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Instagram (Opcional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400">@</span>
                </div>
                <input 
                  type="text"
                  name="instagram"
                  placeholder="usuario"
                  value={customer.instagram}
                  onChange={handleCustomerChange}
                  className="w-full rounded-lg border-slate-300 border pl-7 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Separated Address Fields */}
            <div className="md:col-span-2 mt-4 flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
               <Box className="w-5 h-5 text-indigo-600" />
               <h3 className="text-lg font-medium text-slate-900">Endereço de Entrega</h3>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
              <input 
                type="text"
                name="zipCode"
                placeholder="00.000-000"
                value={customer.zipCode}
                onChange={handleZipCodeChange}
                maxLength={10}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

             <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
              <input 
                type="text"
                name="street"
                value={customer.street}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                <input 
                  type="text"
                  name="number"
                  value={customer.number}
                  onChange={handleCustomerChange}
                  className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                <input 
                  type="text"
                  name="complement"
                  placeholder="Ap, Bloco..."
                  value={customer.complement}
                  onChange={handleCustomerChange}
                  className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

             <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
              <input 
                type="text"
                name="neighborhood"
                value={customer.neighborhood}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 md:col-span-2">
               <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input 
                  type="text"
                  name="city"
                  value={customer.city}
                  onChange={handleCustomerChange}
                  className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                <input 
                  type="text"
                  name="state"
                  maxLength={2}
                  placeholder="SP"
                  value={customer.state}
                  onChange={(e) => setCustomer(prev => ({...prev, state: e.target.value.toUpperCase()}))}
                  className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white uppercase"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-4 flex justify-between border-t border-slate-200">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={step === 1 ? onCancel : () => setStep(1)}
        >
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </Button>
        
        {step === 1 ? (
          <Button 
            type="button" 
            onClick={() => setStep(2)}
          >
            Próximo: Dados do Cliente {cartItems.length > 0 ? `(${cartItems.length} itens)` : ''}
          </Button>
        ) : (
          <Button 
            type="submit"
            disabled={cartItems.length === 0}
            className={cartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Save className="w-4 h-4 mr-2" />
            {initialOrder ? 'Atualizar Pedido' : cartItems.length === 0 ? 'Adicione itens para Salvar' : `Salvar Pedido (${cartItems.length} itens)`}
          </Button>
        )}
      </div>
    </form>
  );
};
