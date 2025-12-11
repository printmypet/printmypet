
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, Order, Customer, PartsColors, ColorOption, Texture, AppUser } from '../types';

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

// --- Auth Management (App Users) ---

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: AppUser; message?: string }> => {
  if (!supabase) return { success: false, message: "Banco de dados não conectado." };

  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // Simple check. For production, use Supabase Auth or Hash comparison
      .single();

    if (error || !data) {
      return { success: false, message: "Usuário ou senha incorretos." };
    }

    return { success: true, user: data as AppUser };
  } catch (e) {
    return { success: false, message: "Erro ao tentar login." };
  }
};

export const registerUser = async (user: Omit<AppUser, 'id'>): Promise<{ success: boolean; message?: string }> => {
  if (!supabase) return { success: false, message: "Banco de dados não conectado." };

  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', user.username)
      .single();

    if (existing) {
      return { success: false, message: "Este usuário já existe." };
    }

    const { error } = await supabase
      .from('app_users')
      .insert([user]);

    if (error) throw error;

    return { success: true, message: "Usuário cadastrado com sucesso!" };
  } catch (e: any) {
    return { success: false, message: e.message || "Erro ao cadastrar." };
  }
};

export const fetchUsers = async (): Promise<AppUser[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error("Error fetching users", error);
    return [];
  }
  return data as AppUser[];
};

export const updateUser = async (user: AppUser): Promise<{ success: boolean; message?: string }> => {
  if (!supabase) return { success: false, message: "Offline" };
  
  try {
    // Check if username is taken by someone else
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', user.username)
      .neq('id', user.id)
      .single();

    if (existing) {
        return { success: false, message: "Este login já está em uso por outro usuário." };
    }

    const { error } = await supabase
      .from('app_users')
      .update({
        name: user.name,
        username: user.username,
        password: user.password,
        role: user.role
      })
      .eq('id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const deleteUser = async (id: string): Promise<{ success: boolean; message?: string }> => {
  if (!supabase) return { success: false, message: "Offline" };
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  return { success: true };
};


// --- Colors Management ---

export const fetchColorsFromSupabase = async (): Promise<PartsColors | null> => {
  if (!supabase) return null;

  // Order by position ascending, then by created_at as fallback
  const { data, error } = await supabase
    .from('colors')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error || !data) {
    console.error('Error fetching colors:', error);
    return null;
  }

  // Transform flat list to PartsColors object
  const newColors: PartsColors = { base: [], ball: [], top: [] };
  
  data.forEach((item: any) => {
    const color: ColorOption = { 
      id: item.id, 
      name: item.name, 
      hex: item.hex,
      position: item.position 
    };
    if (item.part_type === 'base') newColors.base.push(color);
    if (item.part_type === 'ball') newColors.ball.push(color);
    if (item.part_type === 'top') newColors.top.push(color);
  });

  return newColors;
};

export const addColorToSupabase = async (partType: string, name: string, hex: string) => {
  if (!supabase) return;
  // Use a default high position to put it at the end
  const { error } = await supabase.from('colors').insert([{ part_type: partType, name, hex, position: 9999 }]);
  if (error) throw error;
};

export const updateColorPositions = async (colors: ColorOption[]) => {
  if (!supabase) return;

  // Simple sequential update. For huge lists this should be a stored procedure or upsert,
  // but for 10-50 colors, this loop is acceptable.
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    if (color.id) {
      await supabase
        .from('colors')
        .update({ position: i })
        .eq('id', color.id);
    }
  }
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
  
  // Clean the CPF
  const cleanCpf = cpf.trim();
  if (!cleanCpf) return null;

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('cpf', cleanCpf)
    .single();

  if (error || !data) {
    return null;
  }

  // Map snake_case from DB to camelCase for frontend
  return {
    id: data.id,
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    cpf: data.cpf || '',
    instagram: data.instagram || '',
    type: data.type || 'final',
    partnerName: data.partner_name || '',
    address: data.address_full || '', 
    zipCode: data.zip_code || '',
    street: data.street || '',
    number: data.number || '',
    complement: data.complement || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || ''
  };
};

export const upsertCustomer = async (customer: Customer): Promise<string> => {
  if (!supabase) throw new Error("Supabase not initialized");

  // Helper to convert empty strings to null (important for DB constraints/cleanliness)
  const toNull = (val?: string) => (!val || val.trim() === '') ? null : val.trim();

  let existing = null;

  // 1. Only try to find by CPF if a valid CPF is provided
  const cleanCpf = toNull(customer.cpf);
  
  if (cleanCpf) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('cpf', cleanCpf)
      .single();
    existing = data;
  }

  // If no existing by CPF but we have an ID (edit mode), verify existence
  if (!existing && customer.id) {
     const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer.id)
      .single();
     existing = data;
  }

  const customerPayload = {
    name: customer.name.trim(),
    email: toNull(customer.email),
    phone: toNull(customer.phone),
    cpf: cleanCpf, // Can be null now
    instagram: toNull(customer.instagram),
    type: customer.type,
    partner_name: toNull(customer.partnerName),
    address_full: toNull(customer.address),
    zip_code: toNull(customer.zipCode),
    street: toNull(customer.street),
    number: toNull(customer.number),
    complement: toNull(customer.complement),
    neighborhood: toNull(customer.neighborhood),
    city: toNull(customer.city),
    state: toNull(customer.state)
  };

  if (existing) {
    // Update existing customer
    const { error } = await supabase.from('customers').update(customerPayload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  } else {
    // Insert new customer
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
    if (!supabase) return;

    // Join with customers table
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(*)')
      // Fix: order by created_at (DB column), not createdAt (App property)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    if (data) {
       // Map Supabase response to Order Type
       const mappedOrders: Order[] = data.map((row: any) => {
          let customerData: Customer = row.customers;
          
          if (!customerData && row.customer) {
            // Legacy JSON fallback
            customerData = row.customer;
          } else if (customerData) {
             // Map DB columns to frontend
             customerData = {
                ...customerData,
                email: (customerData as any).email || '',
                phone: (customerData as any).phone || '',
                cpf: (customerData as any).cpf || '',
                partnerName: (customerData as any).partner_name || customerData.partnerName || '',
                zipCode: (customerData as any).zip_code || customerData.zipCode || '',
                address: (customerData as any).address_full || customerData.address || '',
                // ensure other fields are not null/undefined for frontend safety
                street: (customerData as any).street || '',
                number: (customerData as any).number || '',
                complement: (customerData as any).complement || '',
                neighborhood: (customerData as any).neighborhood || '',
                city: (customerData as any).city || '',
                state: (customerData as any).state || '',
             };
          }

          return {
            ...row,
            customer: customerData,
            // Explicitly map snake_case columns from DB to camelCase properties for App
            createdAt: row.created_at || new Date().toISOString(), // Fix: Map created_at to createdAt
            shippingCost: row.shipping_cost,
            isPaid: row.is_paid
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

  // 1. Ensure Customer Exists (or Create New)
  const customerId = await upsertCustomer(order.customer);

  // 2. Prepare Order Payload
  // We match the INSERT statement columns (snake_case)
  const cleanPayload = {
    id: order.id,
    created_at: order.createdAt,
    status: order.status,
    price: order.price,
    shipping_cost: order.shippingCost,
    is_paid: order.isPaid,
    customer_id: customerId,
    products: order.products
  };

  const { error } = await supabase
    .from('orders')
    .insert([cleanPayload]);

  if (error) {
    console.error("Error adding order to Supabase: ", error);
    throw error;
  }
};

export const updateOrderInSupabase = async (order: Order) => {
  if (!supabase) return;

  // 1. Update Customer
  const customerId = await upsertCustomer(order.customer);

  // 2. Update Order
  const cleanPayload = {
    status: order.status,
    price: order.price,
    shipping_cost: order.shippingCost,
    is_paid: order.isPaid,
    customer_id: customerId,
    products: order.products
  };

  const { error } = await supabase
    .from('orders')
    .update(cleanPayload)
    .eq('id', order.id);

  if (error) {
    console.error("Error updating order in Supabase: ", error);
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
  // DB column is is_paid
  await supabase.from('orders').update({ is_paid: isPaid }).eq('id', id);
};

// Delete Order
export const deleteOrderFromSupabase = async (id: string) => {
  if (!supabase) return;
  await supabase.from('orders').delete().eq('id', id);
};
