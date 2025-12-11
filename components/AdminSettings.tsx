
import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Settings, Palette, Layers, Box, Circle, Triangle, Cloud, CloudOff, Save, Database, Copy, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { PartsColors, SupabaseConfig, Texture } from '../types';
import { Button } from './ui/Button';
import { testConnection, addColorToSupabase, deleteColorFromSupabase, addTextureToSupabase, deleteTextureFromSupabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

interface AdminSettingsProps {
  partsColors: PartsColors;
  textures: Texture[];
  onUpdatePartsColors: (colors: PartsColors) => void;
  onUpdateTextures: (textures: Texture[]) => void;
  onConfigUpdate: () => void;
  onRefreshColors?: () => void;
  isOnline: boolean;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  partsColors, 
  textures, 
  onUpdatePartsColors, 
  onUpdateTextures,
  onConfigUpdate,
  onRefreshColors,
  isOnline
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'cloud'>(() => {
    return localStorage.getItem('app-supabase-config') ? 'products' : 'cloud';
  });
  
  const [activePart, setActivePart] = useState<keyof PartsColors>('base');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newTextureName, setNewTextureName] = useState('');
  const [isProcessingColor, setIsProcessingColor] = useState(false);
  const [isProcessingTexture, setIsProcessingTexture] = useState(false);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseKey: ''
  });
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message?: string} | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('app-supabase-config');
    if (savedConfig) {
      setSupabaseConfig(JSON.parse(savedConfig));
      setIsCloudConfigured(true);
    }
  }, []);

  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    if (!supabaseConfig.supabaseUrl || !supabaseConfig.supabaseKey) {
       setIsTesting(false);
       setTestResult({ success: false, message: 'Preencha ambos os campos.' });
       return;
    }

    const result = await testConnection(supabaseConfig);
    
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      const cleanConfig = {
        supabaseUrl: supabaseConfig.supabaseUrl.trim(),
        supabaseKey: supabaseConfig.supabaseKey.trim()
      };
      localStorage.setItem('app-supabase-config', JSON.stringify(cleanConfig));
      setIsCloudConfigured(true);
      onConfigUpdate();
    }
  };

  const handleClearCloudConfig = () => {
    if (confirm('Isso desconectará o app da nuvem. Os pedidos voltarão a ser salvos apenas neste dispositivo. Continuar?')) {
      localStorage.removeItem('app-supabase-config');
      setIsCloudConfigured(false);
      setSupabaseConfig({
        supabaseUrl: '',
        supabaseKey: ''
      });
      onConfigUpdate();
    }
  };

  const handleAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newColorName && newColorHex) {
      setIsProcessingColor(true);
      try {
        if (isOnline) {
          await addColorToSupabase(activePart, newColorName, newColorHex);
          if (onRefreshColors) await onRefreshColors();
        } else {
          // Fallback Offline
          const updatedList = [...partsColors[activePart], { name: newColorName, hex: newColorHex }];
          onUpdatePartsColors({
            ...partsColors,
            [activePart]: updatedList
          });
        }
        setNewColorName('');
        setNewColorHex('#000000');
      } catch (e) {
        alert("Erro ao adicionar cor. Verifique o console.");
        console.error(e);
      } finally {
        setIsProcessingColor(false);
      }
    }
  };

  const handleDeleteColor = async (color: any) => {
    if (confirm('Tem certeza que deseja remover esta cor?')) {
      try {
        if (isOnline && color.id) {
           await deleteColorFromSupabase(color.id);
           if (onRefreshColors) await onRefreshColors();
        } else {
           const updatedList = partsColors[activePart].filter(c => c.hex !== color.hex);
           onUpdatePartsColors({
             ...partsColors,
             [activePart]: updatedList
           });
        }
      } catch (e) {
        alert("Erro ao remover cor.");
        console.error(e);
      }
    }
  };

  const handleAddTexture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTextureName) {
      const exists = textures.some(t => t.name.toLowerCase() === newTextureName.toLowerCase());
      if (exists) {
        alert('Esta textura já existe!');
        return;
      }

      setIsProcessingTexture(true);
      try {
        if (isOnline) {
          await addTextureToSupabase(newTextureName);
          if (onRefreshColors) await onRefreshColors();
        } else {
          // Fallback Offline
          onUpdateTextures([...textures, { id: uuidv4(), name: newTextureName }]);
        }
        setNewTextureName('');
      } catch (e) {
         alert("Erro ao adicionar textura.");
         console.error(e);
      } finally {
        setIsProcessingTexture(false);
      }
    }
  };

  const handleDeleteTexture = async (texture: Texture) => {
    if (confirm('Tem certeza que deseja remover esta textura?')) {
      try {
        if (isOnline && texture.id) {
           await deleteTextureFromSupabase(texture.id);
           if (onRefreshColors) await onRefreshColors();
        } else {
           onUpdateTextures(textures.filter(t => t.name !== texture.name));
        }
      } catch (e) {
         alert("Erro ao remover textura.");
      }
    }
  };

  const copySql = () => {
    const sql = `
-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  cpf text UNIQUE,
  email text,
  phone text,
  type text, -- 'final' or 'partner'
  partner_name text,
  instagram text,
  -- Endereço
  address_full text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text
);

-- 2. Tabela de Cores
CREATE TABLE IF NOT EXISTS public.colors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  hex text NOT NULL,
  part_type text NOT NULL -- 'base', 'ball', 'top'
);

-- 3. Tabela de Texturas
CREATE TABLE IF NOT EXISTS public.textures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL UNIQUE
);

-- 4. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY, -- Mantemos ID gerado no front por enquanto
  created_at timestamptz DEFAULT now(),
  status text,
  price numeric,
  shipping_cost numeric,
  is_paid boolean,
  products jsonb, -- Mantemos produtos configurados como JSON
  customer_id uuid REFERENCES public.customers(id),
  customer jsonb -- Mantido temporariamente para legado
);

-- Configurações de Segurança
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.textures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Inserir Texturas Padrão (Se não existirem)
INSERT INTO public.textures (name) VALUES 
('Liso'), ('Hexagonal'), ('Listrado'), ('Pontilhado'), ('Voronoi')
ON CONFLICT (name) DO NOTHING;
    `;
    navigator.clipboard.writeText(sql.trim());
    alert("SQL Atualizado copiado para a área de transferência!");
  };

  const partLabels: Record<keyof PartsColors, string> = {
    base: 'Base',
    ball: 'Bola',
    top: 'Tampa/Topo'
  };

  const partIcons: Record<keyof PartsColors, React.ReactNode> = {
    base: <Box className="w-4 h-4" />,
    ball: <Circle className="w-4 h-4" />,
    top: <Triangle className="w-4 h-4" />
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" />
            Configurações do Sistema
            </h2>
            <p className="text-slate-500 mt-1">Gerencie produtos e conexões.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
                Produtos e Cores
            </button>
             <button
                onClick={() => setActiveTab('cloud')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'cloud' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
                Nuvem (Supabase)
            </button>
        </div>
      </div>

      {activeTab === 'cloud' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-xl border ${isCloudConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center gap-3 mb-6">
                    {isCloudConfigured ? (
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <Cloud className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                            <CloudOff className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {isCloudConfigured ? 'Conectado ao Supabase' : 'Configurar Conexão Supabase'}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {isCloudConfigured 
                                ? 'Seus pedidos estão sendo sincronizados com a nuvem.' 
                                : 'Conecte-se para sincronizar pedidos em tempo real.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            value={supabaseConfig.supabaseUrl}
                            onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseUrl: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            placeholder="https://xyz.supabase.co"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key (public/anon)</label>
                        <input 
                            type="password" 
                            value={supabaseConfig.supabaseKey}
                            onChange={(e) => setSupabaseConfig({...supabaseConfig, supabaseKey: e.target.value})}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            placeholder="eyJxh..."
                            required
                        />
                    </div>

                    {testResult && (
                      <div className={`p-3 rounded-lg text-sm border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} flex items-start gap-2`}>
                        {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                        <div>
                          <strong>{testResult.success ? 'Conexão bem sucedida!' : 'Falha na conexão:'}</strong>
                          <p>{testResult.message || (testResult.success ? 'Conectado! Verifique o topo da página.' : '')}</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-emerald-100/50 flex justify-end gap-3">
                         {isCloudConfigured && (
                            <Button type="button" variant="danger" onClick={handleClearCloudConfig}>
                                Desconectar
                            </Button>
                         )}
                         <Button type="submit" disabled={isTesting}>
                            {isTesting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Testando...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {isCloudConfigured ? 'Atualizar Configuração' : 'Salvar e Conectar'}
                              </>
                            )}
                         </Button>
                    </div>
                </form>
            </div>

            <div className="bg-slate-800 text-slate-200 p-6 rounded-xl shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <Database className="w-5 h-5" />
                    <h3 className="font-bold">Setup do Banco de Dados</h3>
                </div>
                
                <p className="text-sm text-slate-400 mb-4">
                    Copie o SQL abaixo e rode no Supabase para criar as tabelas de Clientes, Cores e Texturas.
                </p>

                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 font-mono text-xs overflow-x-auto relative group flex-1">
                    <pre className="text-emerald-300">
{`-- 1. Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cpf text UNIQUE,
  -- ...campos restantes
  created_at timestamptz DEFAULT now()
);

-- 2. Cores
CREATE TABLE IF NOT EXISTS public.colors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  hex text NOT NULL,
  part_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Texturas
CREATE TABLE IF NOT EXISTS public.textures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 4. Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY,
  products jsonb,
  customer_id uuid REFERENCES public.customers(id),
  -- ...
);

-- (Copie o script completo clicando no botão ao lado)`}
                    </pre>
                    <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copiar SQL Completo"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="mt-4 text-xs text-slate-500">
                   * Se as tabelas já existirem, você precisará adaptá-las ou apagá-las antes.
                </div>
            </div>
        </div>
      )}

      {activeTab === 'products' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Catálogo de Cores
            </h3>
            {isOnline && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">Salvo na Nuvem</span>}
          </div>

          <div className="border-b border-slate-200 px-4 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(Object.keys(partsColors) as Array<keyof PartsColors>).map((part) => (
                <button
                  key={part}
                  onClick={() => setActivePart(part)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    activePart === part
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {partIcons[part]}
                  {partLabels[part]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 text-sm text-indigo-800 mb-4">
              Editando cores para: <strong>{partLabels[activePart]}</strong>
            </div>

            <form onSubmit={handleAddColor} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Cor</label>
                <input 
                  type="text" 
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder={`Cor para ${partLabels[activePart]}...`}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cor</label>
                <input 
                  type="color" 
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="h-10 w-20 p-1 rounded-md border border-slate-300 cursor-pointer bg-white"
                />
              </div>
              <Button type="submit" size="md" disabled={isProcessingColor}>
                {isProcessingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} 
                Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cores Cadastradas - {partLabels[activePart]} ({partsColors[activePart].length})
              </label>
              {partsColors[activePart].map((color) => (
                <div key={color.hex + color.name} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border border-slate-200 shadow-inner" 
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <span className="block font-medium text-slate-900">{color.name}</span>
                      <span className="block text-xs text-slate-400 font-mono">{color.hex}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteColor(color)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-2"
                    title="Remover cor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {partsColors[activePart].length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma cor cadastrada para esta parte.</p>
              )}
            </div>
          </div>
        </div>

        {/* Texture Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Catálogo de Texturas
            </h3>
            {isOnline && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">Salvo na Nuvem</span>}
          </div>
          
          <div className="p-6 space-y-6">
            <form onSubmit={handleAddTexture} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Textura</label>
                <input 
                  type="text" 
                  value={newTextureName}
                  onChange={(e) => setNewTextureName(e.target.value)}
                  placeholder="Ex: Fibra de Carbono"
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white"
                  required
                />
              </div>
              <Button type="submit" size="md" disabled={isProcessingTexture}>
                 {isProcessingTexture ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} 
                 Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Texturas Cadastradas ({textures.length})</label>
              {textures.map((texture) => (
                <div key={texture.name} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="block font-medium text-slate-900">{texture.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTexture(texture)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-2"
                    title="Remover textura"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
