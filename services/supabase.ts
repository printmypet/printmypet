import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Order } from '../types';

let supabase: SupabaseClient | undefined;

// Initialize Supabase with config provided by user
export const initSupabase = (config: SupabaseConfig) => {
  try {
    if (!config.supabaseUrl || !config.supabaseKey) return false;
    
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    console.log("Supabase initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing Supabase:", error);
    return false;
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
       // Map Supabase JSON naming convention if needed, but assuming direct mapping
       // Need to ensure customer and products are parsed if they come as strings, 
       // but Supabase handles JSON columns automatically as objects in JS.
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
        // Simple strategy: Re-fetch all on any change to ensure sort order and consistency
        // Optimization: Could manipulate local array based on payload.eventType (INSERT, UPDATE, DELETE)
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

  // Supabase expects columns matching the object keys.
  // Ensure 'customer' and 'products' columns in Supabase are type JSONB.
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
