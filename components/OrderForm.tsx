import React, { useState } from 'react';
import { Plus, Save, User, Box, Layers, Palette, DollarSign } from 'lucide-react';
import { 
  ColorOption,
  Order, 
  Customer, 
  ProductConfig,
  PartsColors
} from '../types';
import { Button } from './ui/Button';

interface OrderFormProps {
  partsColors: PartsColors;
  availableTextures: string[];
  onSave: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ 
  partsColors, 
  availableTextures, 
  onSave, 
  onCancel 
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  
  // Initialize with first available options or fallbacks
  const [product, setProduct] = useState<ProductConfig>({
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

  const [price, setPrice] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);

  const [customer, setCustomer] = useState<Customer>({
    name: '',
    address: '',
    email: '',
    phone: '',
    cpf: '',
    instagram: ''
  });

  const handleProductChange = (key: keyof ProductConfig, value: string) => {
    setProduct(prev => ({ ...prev, [key]: value }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      customer, 
      product,
      price: parseFloat(price.replace(',', '.')) || 0,
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

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          {step === 1 ? <Box className="w-5 h-5 text-indigo-600"/> : <User className="w-5 h-5 text-indigo-600"/>}
          {step === 1 ? 'Configuração do Produto' : 'Dados do Cliente e Pagamento'}
        </h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-indigo-100 text-indigo-700 font-bold' : ''}`}>Passo 1</span>
          <span className="text-slate-300">/</span>
          <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-indigo-100 text-indigo-700 font-bold' : ''}`}>Passo 2</span>
        </div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4"/> Cores das Partes
                </h3>
                <ColorPicker 
                  label="Parte 1 (Base)" 
                  options={partsColors.base}
                  selected={product.part1Color} 
                  onChange={(c) => handleProductChange('part1Color', c)} 
                />
                <ColorPicker 
                  label="Parte 2 (Bola)" 
                  options={partsColors.ball}
                  selected={product.part2Color} 
                  onChange={(c) => handleProductChange('part2Color', c)} 
                />
                <ColorPicker 
                  label="Parte 3 (Detalhes/Topo)" 
                  options={partsColors.top}
                  selected={product.part3Color} 
                  onChange={(c) => handleProductChange('part3Color', c)} 
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4"/> Textura e Personalização
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Textura (Parte 3)</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="textureType"
                        checked={product.textureType === 'cadastrada'}
                        onChange={() => handleProductChange('textureType', 'cadastrada')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Padrão</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="textureType"
                        checked={product.textureType === 'personalizada'}
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
                  {product.textureType === 'cadastrada' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Selecione a Textura</label>
                      <select 
                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        value={product.textureValue}
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
                        required
                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        placeholder="Ex: Escamas de dragão, Floral..."
                        value={product.textureValue}
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
                        // If turning off, clear the name
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
                      value={product.dogName}
                      onChange={(e) => handleProductChange('dogName', e.target.value)}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea 
                    rows={3}
                    className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                    placeholder="Ex: Detalhes específicos sobre a montagem, cuidados, etc..."
                    value={product.observations}
                    onChange={(e) => handleProductChange('observations', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Visualizer */}
            <div className="bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-200">
              <h4 className="text-slate-500 font-medium mb-12 uppercase tracking-wider text-sm">Pré-visualização Esquemática</h4>
              <div className="relative flex flex-col items-center">
                
                {/* Part 3 (Top) - Cone shape with Paws */}
                <div 
                  className="w-40 h-24 relative z-30 mb-[-16px] transition-colors duration-300 flex items-center justify-center shadow-lg"
                  style={{ 
                    backgroundColor: product.part3Color,
                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                    borderRadius: '0 0 10px 10px'
                  }}
                >
                  {/* Decorative Paw Pattern Overlay */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="paws" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          {/* Simple Paw SVG Path */}
                          <circle cx="10" cy="10" r="3" fill="rgba(0,0,0,0.5)"/>
                          <circle cx="6" cy="6" r="1.5" fill="rgba(0,0,0,0.5)"/>
                          <circle cx="14" cy="6" r="1.5" fill="rgba(0,0,0,0.5)"/>
                          <circle cx="10" cy="4" r="1.5" fill="rgba(0,0,0,0.5)"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#paws)" />
                    </svg>
                  </div>
                  
                  {/* Label for Top Part */}
                  <span className="relative z-40 text-black font-bold text-sm tracking-wider uppercase drop-shadow-sm">TAMPA</span>

                  {/* Texture Tooltip */}
                  <div className="absolute -right-36 top-0 bg-slate-800 text-white text-xs p-2 rounded opacity-0 hover:opacity-100 transition-opacity w-32 pointer-events-none z-50">
                    Textura: {product.textureValue || "Nenhuma"}
                  </div>
                </div>
                
                {/* Part 2 (Middle) - Golf Ball Style */}
                <div 
                  className="w-24 h-24 rounded-full shadow-inner relative z-20 mb-[-20px] transition-colors duration-300 flex items-center justify-center border border-black/5"
                  style={{ backgroundColor: product.part2Color }}
                >
                  {/* Golf Ball Dimple Effect Overlay */}
                  <div className="absolute inset-0 rounded-full opacity-20 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 1px, transparent 1.5px)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0'
                  }}></div>
                  
                  {/* Light reflection/shine for 3D effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/20 to-white/30 pointer-events-none"></div>
                  
                  <span className="text-white/80 text-[10px] font-bold uppercase mix-blend-overlay relative z-10">Bola</span>
                </div>

                {/* Part 1 (Base) - Ring/Saucer Style */}
                <div 
                  className="w-48 h-14 rounded-[50%] z-10 flex items-center justify-center transition-colors duration-300 relative shadow-xl border-b-4 border-black/10"
                  style={{ backgroundColor: product.part1Color }}
                >
                  {/* Inner ring simulation */}
                  <div className="absolute inset-2 rounded-[50%] border-2 border-white/20"></div>
                  <span className="text-black font-bold text-sm uppercase relative z-20">BASE</span>
                </div>
              </div>
              
              <div className="mt-12 flex flex-col gap-1 items-center">
                 <p className="text-xs text-slate-400 text-center max-w-xs">
                  * Representação esquemática baseada no modelo 3D.
                </p>
                <div className="flex gap-4 text-[10px] text-slate-400">
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Topo (Patinhas)</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Bola (Golf)</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Base (Anel)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
               <DollarSign className="w-5 h-5 text-green-600" />
               <h3 className="text-lg font-medium text-slate-900">Financeiro</h3>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Pedido (R$)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">R$</span>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border pl-10 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="md:col-span-1 flex items-end pb-2">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg w-full bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <span className="font-medium text-slate-900">Pedido Pago?</span>
              </label>
            </div>

            <div className="md:col-span-2 mt-4 flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
               <User className="w-5 h-5 text-indigo-600" />
               <h3 className="text-lg font-medium text-slate-900">Informações de Contato</h3>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
              <input 
                type="text"
                name="name"
                required
                value={customer.name}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
              <input 
                type="text"
                name="cpf"
                required
                placeholder="000.000.000-00"
                value={customer.cpf}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
              <input 
                type="email"
                name="email"
                required
                value={customer.email}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp *</label>
              <input 
                type="tel"
                name="phone"
                required
                placeholder="(00) 00000-0000"
                value={customer.phone}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Endereço Completo *</label>
              <input 
                type="text"
                name="address"
                required
                placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                value={customer.address}
                onChange={handleCustomerChange}
                className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
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
          <Button type="button" onClick={() => setStep(2)}>
            Próximo: Dados do Cliente
          </Button>
        ) : (
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            Salvar Pedido
          </Button>
        )}
      </div>
    </form>
  );
};