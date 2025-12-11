
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Order, Customer, PartsColors, ColorOption, Texture } from '../types';

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
    const { error } = await tempClient.from('orders').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return { success: false, message: 'Conexão OK, mas as tabelas não existem. Rode o novo script SQL.' };
      }
      if (error.message?.includes('JWT')) {
        return { success: false, message: 'Chave de API (Anon Key) inválida ou expirada.' };
      }
      return { success: false, message: `Erro do Supabase: ${error.message}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: `Erro de configuração: ${e.message}` };
  }
};

export const getClient = () => supabase;

// --- Colors Management ---

export const fetchColorsFromSupabase = async (): Promise<PartsColors | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase.from('colors').select('*');
  
  if (error || !data) {
    console.error('Error fetching colors:', error);
    return null;
  }

  // Transform flat list to PartsColors object
  const newColors: PartsColors = { base: [], ball: [], top: [] };
  
  data.forEach((item: any) => {
    const color: ColorOption = { id: item.id, name: item.name, hex: item.hex };
    if (item.part_type === 'base') newColors.base.push(color);
    if (item.part_type === 'ball') newColors.ball.push(color);
    if (item.part_type === 'top') newColors.top.push(color);
  });

  return newColors;
};

export const addColorToSupabase = async (partType: string, name: string, hex: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('colors').insert([{ part_type: partType, name, hex }]);
  if (error) throw error;
};

export const deleteColorFromSupabase = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('colors').delete().eq('id', id);
  if (error) throw error;
};

// --- Textures Management ---

export const fetchTexturesFromSupabase = async (): Promise<Texture[] | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase.from('textures').select('*').order('created_at', { ascending: true });
  
  if (error || !data) {
    console.error('Error fetching textures:', error);
    return null;
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name
  }));
};

export const addTextureToSupabase = async (name: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('textures').insert([{ name }]);
  if (error) throw error;
};

export const deleteTextureFromSupabase = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('textures').delete().eq('id', id);
  if (error) throw error;
};


// --- Customer Management ---

export const fetchCustomerByCpf = async (cpf: string): Promise<Customer | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('cpf', cpf)
    .single();

  if (error || !data) {
    // If not found or error, just return null so the form stays as is
    return null;
  }

  // Map snake_case from DB to camelCase for frontend
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    cpf: data.cpf,
    instagram: data.instagram,
    type: data.type || 'final',
    partnerName: data.partner_name,
    address: data.address_full || '', // Fallback
    zipCode: data.zip_code,
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state
  };
};

export const upsertCustomer = async (customer: Customer): Promise<string> => {
  if (!supabase) throw new Error("Supabase not initialized");

  // 1. Check if customer exists by CPF
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('cpf', customer.cpf)
    .single();

  const customerPayload = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    cpf: customer.cpf,
    instagram: customer.instagram,
    type: customer.type,
    partner_name: customer.partnerName,
    address_full: customer.address,
    zip_code: customer.zipCode,
    street: customer.street,
    number: customer.number,
    complement: customer.complement,
    neighborhood: customer.neighborhood,
    city: customer.city,
    state: customer.state
  };

  if (existing) {
    // Update
    await supabase.from('customers').update(customerPayload).eq('id', existing.id);
    return existing.id;
  } else {
    // Insert
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert([customerPayload])
      .select('id')
      .single();
    
    if (error) throw error;
    return newCustomer.id;
  }
};


// --- Order Management ---

export const subscribeToOrders = (onUpdate: (orders: Order[]) => void) => {
  if (!supabase) return () => {};

  const fetchOrders = async () => {
    // Join with customers table
    const { data, error } = await supabase!
      .from('orders')
      .select('*, customers(*)')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    if (data) {
       // Map Supabase response to Order Type
       const mappedOrders: Order[] = data.map((row: any) => {
          // If customer relationship exists, use it. Otherwise fallback to legacy JSON or placeholder
          let customerData: Customer = row.customers;
          
          if (!customerData && row.customer) {
            // Legacy JSON fallback
            customerData = row.customer;
          } else if (customerData) {
             // Map DB columns back to frontend camelCase if needed (though Supabase JS usually handles JSONB well, 
             // here customers is a relation, so columns come as snake_case probably unless configured)
             // Let's ensure address mapping
             customerData = {
                ...customerData,
                partnerName: (customerData as any).partner_name || customerData.partnerName,
                zipCode: (customerData as any).zip_code || customerData.zipCode,
                address: (customerData as any).address_full || customerData.address,
             };
          }

          return {
            ...row,
            customer: customerData
          };
       });
       onUpdate(mappedOrders);
    }
  };

  fetchOrders();

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

export const addOrderToSupabase = async (order: Order) => {
  if (!supabase) return;

  // 1. Ensure Customer Exists
  const customerId = await upsertCustomer(order.customer);

  // 2. Prepare Order Payload
  // We remove the full 'customer' object from the insert payload to avoid duplicating data in JSONB if we want clean separation
  // But for safety/redundancy during migration, we can keep it. 
  // Let's prioritize the relation.
  
  const orderPayload = {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    price: order.price,
    shippingCost: order.shippingCost,
    isPaid: order.isPaid,
    customer_id: customerId, // Foreign Key
    products: order.products // Keep products as JSON for now
  };

  const { error } = await supabase
    .from('orders')
    .insert([orderPayload]);

  if (error) {
    console.error("Error adding order to Supabase: ", error);
    throw error;
  }
};

// Update Order Status
export const updateOrderStatusInSupabase = async (id: string, status: string) => {
  if (!supabase) return;
  await supabase.from('orders').update({ status }).eq('id', id);
};

// Update Order Paid Status
export const updateOrderPaidInSupabase = async (id: string, isPaid: boolean) => {
  if (!supabase) return;
  await supabase.from('orders').update({ isPaid }).eq('id', id);
};

// Delete Order
export const deleteOrderFromSupabase = async (id: string) => {
  if (!supabase) return;
  await supabase.from('orders').delete().eq('id', id);
};
