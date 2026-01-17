/**
 * CRM Layout Component
 * Layout wrapper עם sub-navigation, breadcrumbs דינמיים ו-Quick Actions
 */

import { ReactNode, useMemo } from 'react';
import { ChevronRight, Home, Plus, Search, Filter } from 'lucide-react';
import { useCrm } from '../../../contexts/CrmContext';
import CrmNavigation from './CrmNavigation';

interface CrmLayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  showQuickActions?: boolean;
}

export default function CrmLayout({ 
  children, 
  activeView, 
  onViewChange,
  breadcrumbs = [],
  showQuickActions = true
}: CrmLayoutProps) {
  const { selectedClient, navigateToView } = useCrm();

  // Generate breadcrumbs automatically based on activeView
  const autoBreadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [];
    
    if (activeView === 'client-detail' && selectedClient) {
      crumbs.push(
        { 
          label: 'לקוחות', 
          onClick: () => onViewChange('crm-clients') 
        },
        { 
          label: selectedClient.full_name || 'לקוח' 
        }
      );
    } else if (activeView === 'crm-pipeline') {
      crumbs.push({ label: 'Pipeline' });
    } else if (activeView === 'crm-analytics') {
      crumbs.push({ label: 'אנליטיקה' });
    } else if (activeView === 'crm-reports') {
      crumbs.push({ label: 'דוחות' });
    } else if (activeView === 'crm-clients') {
      crumbs.push({ label: 'לקוחות' });
    }
    
    return crumbs;
  }, [activeView, selectedClient, onViewChange]);

  const finalBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : autoBreadcrumbs;

  const quickActions = useMemo(() => {
    const actions = [];
    
    if (activeView === 'crm-clients' || activeView === 'crm-dashboard') {
      actions.push({
        label: 'לקוח חדש',
        icon: Plus,
        onClick: () => {
          // TODO: Open add client form
          navigateToView('crm-clients');
        }
      });
    }
    
    if (activeView === 'crm-clients') {
      actions.push(
        {
          label: 'חיפוש',
          icon: Search,
          onClick: () => {
            // TODO: Open search
          }
        },
        {
          label: 'פילטרים',
          icon: Filter,
          onClick: () => {
            // TODO: Open filters
          }
        }
      );
    }
    
    return actions;
  }, [activeView, navigateToView]);

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <CrmNavigation activeView={activeView} onViewChange={onViewChange} />
      
      {/* Breadcrumbs & Quick Actions */}
      {(finalBreadcrumbs.length > 0 || (showQuickActions && quickActions.length > 0)) && (
        <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
          {/* Breadcrumbs */}
          {finalBreadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-sm text-zinc-400">
              <button
                onClick={() => onViewChange('crm-dashboard')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>CRM</span>
              </button>
              {finalBreadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-zinc-500">{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>
          )}
          
          {/* Quick Actions */}
          {showQuickActions && quickActions.length > 0 && (
            <div className="flex items-center gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-all"
                    title={action.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
