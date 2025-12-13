
import React, { useState } from 'react';
import { Search, Trash2, Edit2, Package, MapPin, Phone, Mail, FileText, DollarSign, CheckSquare, Square, Instagram, Users, Clock, CheckCircle, ListFilter, Filter, Truck, AlertCircle, Check } from 'lucide-react';
import { Order, OrderStatus, ProductConfig } from '../types';
import { Button } from './ui/Button';

interface OrderListProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdatePaid: (id: string, isPaid: boolean) => void;
  onUpdateProducts?: (id: string, products: ProductConfig[]) => void;
  onDelete: (id: string) => void;
  onEdit: (order: Order) => void;
}

const statusColors: Record<OrderStatus, string> = {
  'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Em Impressão': 'bg-blue-100 text-blue-800 border-blue-200',
  'Acabamento': 'bg-purple-100 text-purple-800 border-purple-200',
  'Concluído': 'bg-green-100 text-green-800 border-green-200',
  'Entregue': 'bg-slate-100 text-slate-800 border-slate-200',
};

type FilterType = 'open' | 'completed' | 'all';

export const OrderList: React.FC<OrderListProps> = ({ orders, onUpdateStatus, onUpdatePaid, onUpdateProducts, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('open');
  const [showOnlyPaid, setShowOnlyPaid] = useState(false);

  const filteredOrders = orders.filter(order => {
    // 1. Text Search Filter
    const matchesSearch = 
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.cpf.includes(searchTerm) ||
      order.id.includes(searchTerm) ||
      order.customer.partnerName?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status Category Filter
    let matchesStatus = true;
    if (filterType === 'open') {
      matchesStatus = ['Pendente', 'Em Impressão', 'Acabamento'].includes(order.status);
    } else if (filterType === 'completed') {
      matchesStatus = ['Concluído', 'Entregue'].includes(order.status);
    }
    // if 'all', matchesStatus remains true

    // 3. Payment Filter
    const matchesPayment = showOnlyPaid ? order.isPaid : true;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleTogglePartStatus = (order: Order, productIndex: number, part: 'part1' | 'part2' | 'part3') => {
     if (!onUpdateProducts) return;

     const newProducts = [...order.products];
     const currentStatus = newProducts[productIndex].printStatus || { part1: false, part2: false, part3: false };
     
     newProducts[productIndex] = {
        ...newProducts[productIndex],
        printStatus: {
           ...currentStatus,
           [part]: !currentStatus[part]
        }
     };

     onUpdateProducts(order.id, newProducts);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">
            Gerenciamento de Pedidos
          </h2>
          
          <div className="flex flex-wrap gap-3 items-center self-start md:self-auto">
             {/* Payment Filter Toggle */}
            <button
              onClick={() => setShowOnlyPaid(!showOnlyPaid)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                showOnlyPaid 
                  ? 'bg-green-100 text-green-700 border-green-200 ring-2 ring-green-100' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
              title="Filtrar apenas pedidos pagos"
            >
              <DollarSign className="w-4 h-4" />
              {showOnlyPaid ? 'Somente Pagos' : 'Filtrar Pagos'}
            </button>

            <div className="h-6 w-px bg-slate-300 hidden md:block"></div>

            <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setFilterType('open')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  filterType === 'open' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                Em Aberto
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  filterType === 'completed' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Concluídos
              </button>
              <button
                onClick={() => setFilterType('all')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  filterType === 'all' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                Todos
              </button>
            </div>
          </div>
        </div>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, CPF, parceiro ou ID..."
            className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum pedido encontrado</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm 
              ? `Não encontramos resultados para "${searchTerm}" no filtro selecionado.` 
              : showOnlyPaid 
                ? "Não há pedidos pagos nesta categoria."
                : filterType === 'open' 
                  ? "Não há pedidos pendentes no momento." 
                  : "Ainda não há pedidos nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="text-sm text-slate-500 font-medium flex gap-2 items-center">
            <span>Mostrando {filteredOrders.length} pedido(s) {filterType === 'open' ? 'em aberto' : filterType === 'completed' ? 'concluídos' : ''}</span>
            {showOnlyPaid && (
               <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                 <DollarSign className="w-3 h-3" /> Apenas Pagos
               </span>
            )}
          </div>
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">{order.customer.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      {order.customer.type === 'partner' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {order.customer.partnerName || 'Parceiro'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> CPF: {order.customer.cpf}</span>
                      <span className="flex items-center gap-1">ID: #{order.id.slice(0, 8)}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <Button variant="secondary" size="sm" onClick={() => onEdit(order)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                        <Edit2 className="w-4 h-4 mr-1" /> Editar
                     </Button>
                     <select 
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                      className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer h-9"
                     >
                       <option value="Pendente">Pendente</option>
                       <option value="Em Impressão">Em Impressão</option>
                       <option value="Acabamento">Acabamento</option>
                       <option value="Concluído">Concluído</option>
                       <option value="Entregue">Entregue</option>
                     </select>
                     <Button variant="danger" size="sm" onClick={() => {
                       if(confirm('Tem certeza que deseja excluir este pedido?')) onDelete(order.id);
                     }}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                  {/* Product Details (Iterate over items) */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500"/> Itens do Pedido ({order.products.length})
                    </h4>
                    
                    <div className="space-y-3">
                        {order.products.map((product, idx) => {
                            const pStatus = product.printStatus || { part1: false, part2: false, part3: false };
                            const isAllPrinted = pStatus.part1 && pStatus.part2 && pStatus.part3;

                            return (
                            <div key={idx} className={`rounded-lg p-3 text-sm border transition-colors ${isAllPrinted ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="font-medium text-indigo-900 mb-2 border-b border-slate-200 pb-1 flex justify-between">
                                    <span>Item #{idx + 1}</span>
                                    {product.dogName && <span className="text-indigo-600">{product.dogName}</span>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-xs">Produção:</span>
                                        <div className="flex gap-2">
                                            {/* Part 1 */}
                                            <div 
                                                onClick={() => handleTogglePartStatus(order, idx, 'part1')}
                                                className={`relative w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 w-6 h-6`} 
                                                style={{backgroundColor: product.part1Color}} 
                                                title="Base (Clique para confirmar)"
                                            >
                                                {pStatus.part1 && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                                            </div>

                                            {/* Part 2 */}
                                            <div 
                                                onClick={() => handleTogglePartStatus(order, idx, 'part2')}
                                                className={`relative w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 w-6 h-6`} 
                                                style={{backgroundColor: product.part2Color}} 
                                                title="Bola (Clique para confirmar)"
                                            >
                                                {pStatus.part2 && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                                            </div>

                                            {/* Part 3 */}
                                            <div 
                                                onClick={() => handleTogglePartStatus(order, idx, 'part3')}
                                                className={`relative w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center transition-all cursor-pointer hover:ring-2 hover:ring-indigo-300 w-6 h-6`} 
                                                style={{backgroundColor: product.part3Color}} 
                                                title="Topo (Clique para confirmar)"
                                            >
                                                {pStatus.part3 && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-[10px] text-slate-400 text-right">
                                        * Clique nas cores para marcar as peças prontas
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-xs">Textura:</span>
                                        <span className="text-slate-800 text-xs">{product.textureValue}</span>
                                    </div>
                                    {product.observations && (
                                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md flex gap-2 items-start animate-fade-in">
                                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-amber-900">
                                                <span className="font-bold block text-amber-700 mb-0.5 uppercase tracking-wide text-[10px]">Observação:</span>
                                                {product.observations}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500"/> Entrega e Contato
                    </h4>
                    <div className="space-y-3 text-sm text-slate-600">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                        {order.customer.address}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <a href={`mailto:${order.customer.email}`} className="hover:text-indigo-600">{order.customer.email}</a>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <a href={`tel:${order.customer.phone}`} className="hover:text-indigo-600">{order.customer.phone}</a>
                      </p>
                      {order.customer.instagram && (
                        <p className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-slate-400 shrink-0" />
                          <a href={`https://instagram.com/${order.customer.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
                            @{order.customer.instagram.replace('@', '')}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600"/> Financeiro
                    </h4>
                    <div className="bg-white border border-slate-100 rounded-lg p-4 space-y-4 shadow-sm">
                      <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-end">
                            <span className="text-slate-500 text-sm">Valor Total</span>
                            <span className="text-xl font-bold text-slate-900">{formatCurrency(order.price || 0)}</span>
                         </div>
                         {order.shippingCost !== undefined && order.shippingCost > 0 && (
                            <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-1 mt-1">
                                <span className="flex items-center gap-1"><Truck className="w-3 h-3"/> Frete incluso</span>
                                <span>{formatCurrency(order.shippingCost)}</span>
                            </div>
                         )}
                      </div>
                      
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${order.isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                        onClick={() => onUpdatePaid(order.id, !order.isPaid)}
                      >
                         {order.isPaid ? (
                           <CheckSquare className="w-5 h-5 text-green-600" />
                         ) : (
                           <Square className="w-5 h-5 text-red-500" />
                         )}
                         <div className="flex flex-col">
                           <span className={`font-semibold ${order.isPaid ? 'text-green-800' : 'text-red-800'}`}>
                             {order.isPaid ? 'PAGO' : 'NÃO PAGO'}
                           </span>
                           <span className="text-xs text-slate-500">Clique para alterar</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
