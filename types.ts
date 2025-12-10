export type ColorOption = {
  name: string;
  hex: string;
};

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
  name: string;
  address: string;
  email: string;
  phone: string;
  cpf: string;
  instagram?: string;
}

export interface ProductConfig {
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
  product: ProductConfig;
  status: OrderStatus;
  price: number;
  isPaid: boolean;
}