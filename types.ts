
export type ColorOption = {
  id?: string; // ID from Database
  name: string;
  hex: string;
  position?: number;
};

export interface Texture {
  id?: string;
  name: string;
}

export const DEFAULT_COLORS: ColorOption[] = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Preto', hex: '#1F2937' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Roxo', hex: '#A855F7' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Cinza', hex: '#6B7280' },
];

export interface PartsColors {
  base: ColorOption[];
  ball: ColorOption[];
  top: ColorOption[];
}

export const DEFAULT_TEXTURES = [
  'Liso',
  'Hexagonal',
  'Listrado',
  'Pontilhado',
  'Voronoi'
];

export type OrderStatus = 'Pendente' | 'Em Impressão' | 'Acabamento' | 'Concluído' | 'Entregue';

export interface Customer {
  id?: string; // Database ID
  name: string;
  email: string;
  phone: string;
  cpf: string;
  instagram?: string;
  // New fields for Partner/Final Customer logic
  type: 'final' | 'partner';
  partnerName?: string;
  // Address fields
  address: string; // Full formatted address for display
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface ProductConfig {
  id: string; // Temporary ID for list management in form
  part1Color: string; // Base
  part2Color: string; // Bola
  part3Color: string; // Detalhe/Topo
  textureType: 'cadastrada' | 'personalizada';
  textureValue: string;
  dogName: string;
  observations: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customer: Customer;
  customerId?: string; // Foreign Key
  products: ProductConfig[]; // Changed from single product to array
  status: OrderStatus;
  price: number; // Total Value (Products + Shipping)
  shippingCost?: number; // Shipping Value component
  isPaid: boolean;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}
