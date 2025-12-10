import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Order } from '../types';

interface StatsDashboardProps {
  orders: Order[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ orders }) => {
  // Calculate status counts
  const statusData = [
    { name: 'Pendente', count: orders.filter(o => o.status === 'Pendente').length, color: '#FCD34D' },
    { name: 'Em Impressão', count: orders.filter(o => o.status === 'Em Impressão').length, color: '#60A5FA' },
    { name: 'Acabamento', count: orders.filter(o => o.status === 'Acabamento').length, color: '#A78BFA' },
    { name: 'Concluído', count: orders.filter(o => o.status === 'Concluído').length, color: '#4ADE80' },
  ];

  // Calculate texture popularity
  const textureCounts = orders.reduce((acc, order) => {
    const type = order.product.textureType === 'cadastrada' ? 'Padrão' : 'Custom';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const textureData = Object.entries(textureCounts).map(([name, value]) => ({ name, value }));
  const textureColors = ['#818CF8', '#F472B6'];

  if (orders.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Pedidos por Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Tipos de Textura</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={textureData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {textureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={textureColors[index % textureColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
           <div className="flex justify-center gap-4 text-sm text-slate-600 mt-2">
            {textureData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: textureColors[index % textureColors.length] }}></span>
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};