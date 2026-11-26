import * as LucideIcons from "lucide-react";
import {
  User,
  Mail,
  Phone,
  Pencil,
  Lock,
  Shield,
  ShieldCheck,
  Key,
  Smartphone,
  ShoppingBag,
  LogOut,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  Copy,
  Home,
  Package,
  Clock,
  Truck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  MessageSquare,
  Trash2,
  Table,
  Smile,
  Paperclip,
  MapPin,
  Folder,
  FileText,
  Globe,
  Star,
  Sparkles,
  Quote,
  Ban,
  ShoppingCart,
  UserCircle2,
  FilePenLine,
  Search,
  Filter,
  Download,
  Upload,
  RotateCw,
  Eye,
  EyeOff,
  Tag,
  CreditCard,
  HelpCircle,
  ExternalLink,
  MoreHorizontal,
  MoreVertical,
  Calendar,
  Bell,
  SlidersHorizontal,
  GripVertical,
  Percent,
  Rocket,
  Users,
  Columns3,
} from "lucide-react";

// Re-export all Lucide icons so pages can import named icons directly
export * from "lucide-react";

// Canonical mapping of legacy icon names to standard Lucide React icons
const ICON_MAP = {
  user: User,
  mail: Mail,
  phone: Phone,
  pencil: Pencil,
  lock: Lock,
  shield: Shield,
  "shield-check": ShieldCheck,
  key: Key,
  smartphone: Smartphone,
  bag: ShoppingBag,
  logout: LogOut,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  check: Check,
  "check-circle": CheckCircle2,
  alert: AlertTriangle,
  x: X,
  send: Send,
  copy: Copy,
  home: Home,
  package: Package,
  clock: Clock,
  truck: Truck,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  plus: Plus,
  minus: Minus,
  chat: MessageSquare,
  trash: Trash2,
  table: Table,
  smile: Smile,
  paperclip: Paperclip,
  "map-pin": MapPin,
  folder: Folder,
  file: FileText,
  globe: Globe,
  star: Star,
  sparkle: Sparkles,
  quote: Quote,
  ban: Ban,
  shopping: ShoppingCart,
  "user-circle": UserCircle2,
  "pencil-line": FilePenLine,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  refresh: RotateCw,
  eye: Eye,
  "eye-off": EyeOff,
  tag: Tag,
  "credit-card": CreditCard,
  "help-circle": HelpCircle,
  "external-link": ExternalLink,
  "more-horizontal": MoreHorizontal,
  "more-vertical": MoreVertical,
  calendar: Calendar,
  bell: Bell,
  sliders: SlidersHorizontal,
  "grip-vertical": GripVertical,
  percent: Percent,
  rocket: Rocket,
  users: Users,
  columns: Columns3,
};

function toPascalCase(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/(^\w|-\w)/g, (m) => m.replace("-", "").toUpperCase());
}

/**
 * Standardized SVG Icon component powered by Lucide React.
 * Supports legacy name lookup, direct Lucide names (kebab-case or PascalCase),
 * and standard sizing, stroke width, and coloring.
 */
export default function Icon({ name, className = "h-4 w-4", size, strokeWidth = 1.75, ...props }) {
  if (!name) return null;

  const Component = ICON_MAP[name] || LucideIcons[toPascalCase(name)] || LucideIcons[name];

  if (!Component) {
    return null;
  }

  return (
    <Component
      className={`shrink-0 ${className}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Icon, ICON_MAP, ICON_MAP as PATHS };
