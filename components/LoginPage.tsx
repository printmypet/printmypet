
import React, { useState } from 'react';
import { User, Lock, Key, ArrowRight, LogIn, WifiOff, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { loginUser } from '../services/supabase';
import { AppUser } from '../types';

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
  isOnline: boolean;
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isOnline, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Fallback para admin local se não tiver rede
    if (!isOnline && username === 'admin' && password === 'passroot') {
       onLogin({ id: 'local-admin', name: 'Admin Local', username: 'admin', role: 'admin' });
       setLoading(false);
       return;
    }

    const res = await loginUser(username, password);
    if (res.success && res.user) {
      onLogin(res.user);
    } else {
      setError(res.message || 'Erro ao entrar.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Visual */}
        <div className={`p-8 text-center relative overflow-hidden ${isOnline ? 'bg-slate-900' : 'bg-slate-800'}`}>
           <div className="relative z-10">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-4 backdrop-blur-sm border border-indigo-500/30">
               <LogIn className="w-8 h-8 text-indigo-400" />
             </div>
             <h1 className="text-2xl font-bold text-white mb-1 tracking-tight font-logo">
               PrintMy<span className="text-sky-400">[]</span>3D
             </h1>
             <p className="text-slate-400 text-sm">Controle de Produção</p>
           </div>
           
           {/* Decorative Circles */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-indigo-500 blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-sky-500 blur-3xl"></div>
           </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6 text-center">
             <h2 className="text-xl font-semibold text-slate-800">Bem-vindo(a)</h2>
             <p className="text-slate-500 text-sm">Faça login para acessar o sistema.</p>
          </div>

          {!isOnline && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-3 items-start">
              <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                 <strong className="block mb-1">Modo Offline (Sem Banco de Dados)</strong>
                 O sistema não encontrou a configuração do Supabase. Isso é comum em abas anônimas.
                 <br/><br/>
                 Para configurar, entre como <strong>admin</strong> (senha: <strong>passroot</strong>) e vá em Admin &gt; Nuvem.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="Seu login"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="Sua senha"
                />
              </div>
            </div>
            
            <div className="space-y-3 mt-6">
                <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Acessar Sistema'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                
                <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-full"
                    onClick={onBack}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
