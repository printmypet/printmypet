import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Settings, Palette, Layers, Box, Circle, Triangle, Cloud, CloudOff, Save } from 'lucide-react';
import { ColorOption, PartsColors, FirebaseConfig } from '../types';
import { Button } from './ui/Button';

interface AdminSettingsProps {
  partsColors: PartsColors;
  textures: string[];
  onUpdatePartsColors: (colors: PartsColors) => void;
  onUpdateTextures: (textures: string[]) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  partsColors, 
  textures, 
  onUpdatePartsColors, 
  onUpdateTextures 
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'cloud'>('products');
  
  // Local state for product config
  const [activePart, setActivePart] = useState<keyof PartsColors>('base');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newTextureName, setNewTextureName] = useState('');

  // Local state for Cloud Config
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('app-firebase-config');
    if (savedConfig) {
      setFirebaseConfig(JSON.parse(savedConfig));
      setIsCloudConfigured(true);
    }
  }, []);

  const handleSaveCloudConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('app-firebase-config', JSON.stringify(firebaseConfig));
    setIsCloudConfigured(true);
    alert('Configuração salva! Recarregue a página para conectar.');
    window.location.reload();
  };

  const handleClearCloudConfig = () => {
    if (confirm('Isso desconectará o app da nuvem. Os pedidos voltarão a ser salvos apenas neste dispositivo. Continuar?')) {
      localStorage.removeItem('app-firebase-config');
      setIsCloudConfigured(false);
      setFirebaseConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      });
      window.location.reload();
    }
  };

  const handleAddColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColorName && newColorHex) {
      const updatedList = [...partsColors[activePart], { name: newColorName, hex: newColorHex }];
      onUpdatePartsColors({
        ...partsColors,
        [activePart]: updatedList
      });
      setNewColorName('');
      setNewColorHex('#000000');
    }
  };

  const handleDeleteColor = (hexToDelete: string) => {
    if (confirm('Tem certeza que deseja remover esta cor?')) {
      const updatedList = partsColors[activePart].filter(c => c.hex !== hexToDelete);
      onUpdatePartsColors({
        ...partsColors,
        [activePart]: updatedList
      });
    }
  };

  const handleAddTexture = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTextureName) {
      if (!textures.includes(newTextureName)) {
        onUpdateTextures([...textures, newTextureName]);
        setNewTextureName('');
      } else {
        alert('Esta textura já existe!');
      }
    }
  };

  const handleDeleteTexture = (textureToDelete: string) => {
    if (confirm('Tem certeza que deseja remover esta textura?')) {
      onUpdateTextures(textures.filter(t => t !== textureToDelete));
    }
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
                Nuvem / Backup
            </button>
        </div>
      </div>

      {activeTab === 'cloud' && (
        <div className="max-w-2xl mx-auto">
            <div className={`p-6 rounded-xl border ${isCloudConfigured ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center gap-3 mb-6">
                    {isCloudConfigured ? (
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <Cloud className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                            <CloudOff className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {isCloudConfigured ? 'Conectado ao Firebase' : 'Configurar Conexão Firebase'}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {isCloudConfigured 
                                ? 'Seus pedidos estão sendo sincronizados com a nuvem.' 
                                : 'Conecte-se para compartilhar pedidos entre dispositivos.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project ID</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.projectId}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                                placeholder="ex: meupet-3d"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.apiKey}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, apiKey: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                                placeholder="AIzaSy..."
                                required
                            />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Auth Domain</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.authDomain}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, authDomain: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                                placeholder="meupet-3d.firebaseapp.com"
                                required
                            />
                        </div>
                         <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Storage Bucket</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.storageBucket}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, storageBucket: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                                placeholder="meupet-3d.appspot.com"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Messaging Sender ID</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.messagingSenderId}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, messagingSenderId: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">App ID</label>
                            <input 
                                type="text" 
                                value={firebaseConfig.appId}
                                onChange={(e) => setFirebaseConfig({...firebaseConfig, appId: e.target.value})}
                                className="w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                         {isCloudConfigured && (
                            <Button type="button" variant="danger" onClick={handleClearCloudConfig}>
                                Desconectar
                            </Button>
                         )}
                         <Button type="submit">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Configuração
                         </Button>
                    </div>
                </form>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                    <strong>Como obter esses dados?</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                        <li>Acesse o console do Firebase.</li>
                        <li>Crie um projeto e adicione um App Web.</li>
                        <li>Nas configurações do projeto, role até o final para ver o "SDK setup and configuration".</li>
                        <li>Selecione "Config" e copie os valores para cá.</li>
                        <li>Lembre-se de criar o Banco de Dados (Firestore) no console!</li>
                    </ol>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'products' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Catálogo de Cores por Parte
            </h3>
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
              <Button type="submit" size="md">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cores Cadastradas - {partLabels[activePart]} ({partsColors[activePart].length})
              </label>
              {partsColors[activePart].map((color) => (
                <div key={color.hex} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm">
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
                    onClick={() => handleDeleteColor(color.hex)}
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
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Catálogo de Texturas
            </h3>
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
              <Button type="submit" size="md">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Texturas Cadastradas ({textures.length})</label>
              {textures.map((texture) => (
                <div key={texture} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="block font-medium text-slate-900">{texture}</span>
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