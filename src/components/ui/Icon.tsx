import {
  ArrowDownUp,
  Banknote,
  Briefcase,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  Film,
  Filter,
  Gift,
  HeartPulse,
  House,
  Info,
  Landmark,
  Laptop,
  LayoutDashboard,
  List,
  Menu,
  Moon,
  Pencil,
  Plane,
  Plus,
  Redo2,
  Repeat,
  Search,
  Settings,
  Shirt,
  ShoppingCart,
  Sun,
  Tag,
  TriangleAlert,
  Trash2,
  Undo2,
  Upload,
  Utensils,
  Wallet,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Every icon name a Category / nav item / UI control can reference, in kebab-case. */
export const ICON_REGISTRY = {
  briefcase: Briefcase,
  laptop: Laptop,
  'shopping-cart': ShoppingCart,
  house: House,
  zap: Zap,
  car: Car,
  utensils: Utensils,
  film: Film,
  shirt: Shirt,
  'heart-pulse': HeartPulse,
  repeat: Repeat,
  plane: Plane,
  tag: Tag,
  gift: Gift,
  landmark: Landmark,
  'credit-card': CreditCard,
  banknote: Banknote,
  wallet: Wallet,
  'layout-dashboard': LayoutDashboard,
  list: List,
  settings: Settings,
  calendar: Calendar,
  moon: Moon,
  sun: Sun,
  plus: Plus,
  pencil: Pencil,
  'trash-2': Trash2,
  x: X,
  check: Check,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'undo-2': Undo2,
  'redo-2': Redo2,
  'circle-alert': CircleAlert,
  'triangle-alert': TriangleAlert,
  info: Info,
  menu: Menu,
  'arrow-down-up': ArrowDownUp,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof ICON_REGISTRY;

export function isIconName(value: string): value is IconName {
  return value in ICON_REGISTRY;
}

export const CATEGORY_ICON_NAMES: IconName[] = [
  'briefcase',
  'laptop',
  'shopping-cart',
  'house',
  'zap',
  'car',
  'utensils',
  'film',
  'shirt',
  'heart-pulse',
  'repeat',
  'plane',
  'tag',
  'gift',
  'landmark',
  'credit-card',
  'banknote',
  'wallet',
];

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = ICON_REGISTRY[name];
  return <Component {...props} />;
}

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md';
}

/** A small colored circle badge with the category's icon — used in every list that shows a category. */
export function CategoryIcon({ icon, color, size = 'md' }: CategoryIconProps) {
  const dimension = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 14 : 16;
  const resolved = (icon in ICON_REGISTRY ? icon : 'tag') as IconName;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${dimension}`}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <Icon name={resolved} size={iconSize} strokeWidth={2} />
    </span>
  );
}
