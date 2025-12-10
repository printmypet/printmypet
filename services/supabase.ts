
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Order } from '../types';

let supabase: SupabaseClient | undefined;

// Initialize Supabase with config provided by user
export const initSupabase = (config: SupabaseConfig) => {
  try {
    if (!config.supabaseUrl || !config.supabaseKey) return false;
    
    // Basic formatting cleanup
    const url = config.supabaseUrl.trim();
    const key = config.supabaseKey.trim();

    supabase = createClient(url, key);
    console.log("Supabase initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing Supabase:", error);
    return false;
  }
};

// New function to test connection explicitly
export const testConnection = async (config: SupabaseConfig): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = config.supabaseUrl.trim();
    const key = config.supabaseKey.trim();

    if (!url.startsWith('https://')) {
      return { success: false, message: 'A URL deve começar com https://' };
    }

    const tempClient = createClient(url, key);
    
    // Try to fetch just one ID to verify connection and permissions
    // We limit to 0 just to check the API response/headers without needing real data
    const { error } = await tempClient.from('orders').select('id').limit(1);

    if (error) {
      // Analyze specific Supabase errors
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return { success: false, message: 'Conexão OK, mas a tabela "orders" não existe. Rode o script SQL no Supabase.' };
      }
      if (error.message?.includes('JWT')) {
        return { success: false, message: 'Chave de API (Anon Key) inválida ou expirada.' };
      }
      if (error.message?.includes('FetchError') || error.message?.includes('Network request failed')) {
         return { success: false, message: 'Erro de rede. Verifique a URL do projeto.' };
      }
      return { success: false, message: `Erro do Supabase: ${error.message}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: `Erro de configuração: ${e.message}` };
  }
};

export const getClient = () => supabase;

// Subscribe to Orders Table
export const subscribeToOrders = (onUpdate: (orders: Order[]) => void) => {
  if (!supabase) return () => {};

  // 1. Fetch initial data
  const fetchOrders = async () => {
    const { data, error } = await supabase!
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false }); // Supabase uses specific syntax for ordering

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    if (data) {
       onUpdate(data as Order[]);
    }
  };

  fetchOrders();

  // 2. Subscribe to Realtime changes
  const channel = supabase
    .channel('orders_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        fetchOrders();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

// Add Order
export const addOrderToSupabase = async (order: Order) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('orders')
    .insert([order]);

  if (error) {
    console.error("Error adding order to Supabase: ", error);
    throw error;
  }
};

// Update Order Status
export const updateOrderStatusInSupabase = async (id: string, status: string) => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id);

  if (error) {
     console.error("Error updating status: ", error);
  }
};

// Update Order Paid Status
export const updateOrderPaidInSupabase = async (id: string, isPaid: boolean) => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('orders')
    .update({ isPaid })
    .eq('id', id);

  if (error) {
     console.error("Error updating paid status: ", error);
  }
};

// Delete Order
export const deleteOrderFromSupabase = async (id: string) => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
     console.error("Error deleting order: ", error);
  }
};
