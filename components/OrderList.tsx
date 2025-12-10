import React, { useState } from 'react';
import { Search, Trash2, Edit2, Package, MapPin, Phone, Mail, FileText, DollarSign, CheckSquare, Square, Instagram } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { Button } from './ui/Button';

interface OrderListProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdatePaid: (id: string, isPaid: boolean) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<OrderStatus, string> = {
  'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Em Impressão': 'bg-blue-100 text-blue-800 border-blue-200',
  'Acabamento': 'bg-purple-100 text-purple-800 border-purple-200',
  'Concluído': 'bg-green-100 text-green-800 border-green-200',
  'Entregue': 'bg-slate-100 text-slate-800 border-slate-200',
};

export const OrderList: React.FC<OrderListProps> = ({ orders, onUpdateStatus, onUpdatePaid, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(order => 
    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.cpf.includes(searchTerm) ||
    order.id.includes(searchTerm)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          Pedidos Recentes ({orders.length})
        </h2>
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou ID..."
            className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Nenhum pedido encontrado</h3>
          <p className="text-slate-500">Tente ajustar sua busca ou adicione um novo pedido.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
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
                    </div>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-4">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> CPF: {order.customer.cpf}</span>
                      <span className="flex items-center gap-1">ID: #{order.id.slice(0, 8)}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <select 
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                      className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
                  {/* Product Details */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500"/> Detalhes do Produto
                    </h4>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Base (Parte 1):</span>
                        <span className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full border border-slate-300" style={{backgroundColor: order.product.part1Color}}></span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Bola (Parte 2):</span>
                        <span className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full border border-slate-300" style={{backgroundColor: order.product.part2Color}}></span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Topo (Parte 3):</span>
                        <span className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full border border-slate-300" style={{backgroundColor: order.product.part3Color}}></span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
                        <span className="text-slate-600">Textura:</span>
                        <span className="font-medium text-slate-800">{order.product.textureValue} <span className="text-xs text-slate-400">({order.product.textureType})</span></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Nome do Pet:</span>
                        <span className="font-medium text-indigo-600">{order.product.dogName || '-'}</span>
                      </div>
                      
                      {order.product.observations && (
                         <div className="pt-2 mt-2 border-t border-slate-200">
                           <span className="block text-slate-600 mb-1 text-xs uppercase">Observações:</span>
                           <p className="text-slate-800 bg-white p-2 rounded border border-slate-100 italic">
                             {order.product.observations}
                           </p>
                         </div>
                      )}
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
                      <div className="flex justify-between items-end">
                         <span className="text-slate-500 text-sm">Valor Total</span>
                         <span className="text-xl font-bold text-slate-900">{formatCurrency(order.price || 0)}</span>
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