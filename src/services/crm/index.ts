/**
 * CRM Services Barrel Export
 * Export מרכזי לכל שירותי ה-CRM
 */

// Core CRM Service
export { CrmService } from '../crmService';
export type { 
  ClientCalendarStats,
  ClientInteraction 
} from '../api/crmClientsApi';

// CRM Reports Service
export { CrmReportsService } from '../crmReportsService';
export type {
  ClientPipelineStats,
  RevenueStats,
  ActivityStats,
  ClientNeedingFollowUp
} from '../crmReportsService';

// CRM Pipeline Service
export { CrmPipelineService } from '../crmPipelineService';
export type {
  PipelineStage,
  PipelineStats,
  PipelineMovement,
  PipelineOpportunity
} from '../crmPipelineService';

// CRM Automation Service
export { CrmAutomationService } from '../crmAutomationService';
export type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationSchedule
} from '../crmAutomationService';

// Communication Service
export { CommunicationService } from '../communicationService';
export type {
  CommunicationTemplate,
  CommunicationMessage
} from '../communicationService';

// Payment Service
export { PaymentService } from '../paymentService';
export type {
  Payment,
  PaymentStatus,
  Invoice
} from '../paymentService';

// Document Service
export { DocumentService } from '../documentService';
export type {
  Document,
  DocumentCategory
} from '../documentService';

// Advanced Analytics Service
export { AdvancedAnalyticsService } from '../advancedAnalyticsService';
export type {
  ClientLifetimeValue,
  ChurnAnalysis,
  ConversionFunnel
} from '../advancedAnalyticsService';

// Segmentation Service
export { SegmentationService } from '../segmentationService';
export type {
  Segment,
  SegmentCriteria
} from '../segmentationService';
