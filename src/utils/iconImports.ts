/**
 * Icon Imports Helper
 * 
 * Centralized icon imports to prevent typos and ensure consistency.
 * Always import icons from this file instead of directly from lucide-react.
 */

export {
  Plus,
  TrendingDown,
  TrendingUp,
  Scale,
  BarChart3,
  Trash2,
  Edit,
  User,
  Activity,
  ArrowRight,
  Sparkles,
  List,
  Table2,
  Calculator,
  Target,
  Minus,
} from 'lucide-react';

// Re-export with aliases for clarity
export { TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon } from 'lucide-react';

/**
 * Common icon sets for consistency
 */
export const ICONS = {
  TRENDING_UP: 'TrendingUp' as const,
  TRENDING_DOWN: 'TrendingDown' as const,
  TRENDING_UP_ICON: 'TrendingUpIcon' as const,
  TRENDING_DOWN_ICON: 'TrendingDownIcon' as const,
} as const;
