/**
 * CRM Components Barrel Export
 * Export מרכזי לכל components של CRM
 */

// Layout & Navigation
export { default as CrmLayout } from './CrmLayout';
export { default as CrmNavigation } from './CrmNavigation';

// Dashboard
export { default as CrmDashboard } from './dashboard/CrmDashboard';

// Pipeline
export { default as PipelineView } from './pipeline/PipelineView';

// Analytics
export { default as AdvancedAnalytics } from './analytics/AdvancedAnalytics';

// Reports
export { default as CrmReportsView } from './reports/CrmReportsView';

// Clients
export { default as ClientsListViewEnhanced } from './clients/ClientsListViewEnhanced';
export { default as ClientCard } from './clients/ClientCard';
export { default as ClientDetailView } from './clients/ClientDetailView';
export { default as AdvancedFilters } from './clients/AdvancedFilters';

// Automation
export { default as AutomationRulesView } from './automation/AutomationRulesView';
export { default as VisualRuleBuilder } from './automation/VisualRuleBuilder';

// Shared Components
export * from './shared';
