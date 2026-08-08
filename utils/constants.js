const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  ENGINEER: 'engineer',
  SUPERVISOR: 'supervisor',
  WORKER: 'worker',
};

const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  DELAYED: 'delayed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
};

const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const CONSTRUCTION_STAGES = [
  'Planning',
  'Site Preparation',
  'Foundation',
  'Structure',
  'Brick Work',
  'Electrical',
  'Plumbing',
  'Flooring',
  'Painting',
  'Interior',
  'Final Inspection',
  'Completed',
];

const STAGE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
};

const EXPENSE_CATEGORIES = [
  'Material',
  'Labor',
  'Equipment',
  'Transport',
  'Subcontractor',
  'Permits',
  'Utilities',
  'Miscellaneous',
];

const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const DOCUMENT_TYPES = [
  'drawing',
  'contract',
  'invoice',
  'report',
  'image',
  'other',
];

const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  DEADLINE_APPROACHING: 'deadline_approaching',
  MATERIAL_SHORTAGE: 'material_shortage',
  PROJECT_DELAY: 'project_delay',
  APPROVAL_REQUEST: 'approval_request',
  EXPENSE_APPROVED: 'expense_approved',
  EXPENSE_REJECTED: 'expense_rejected',
  PROJECT_CREATED: 'project_created',
  PROGRESS_UPDATE: 'progress_update',
  CHAT_MESSAGE: 'chat_message',
  GENERAL: 'general',
};

const EQUIPMENT_AVAILABILITY = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  UNAVAILABLE: 'unavailable',
};

module.exports = {
  ROLES,
  PROJECT_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  CONSTRUCTION_STAGES,
  STAGE_STATUS,
  EXPENSE_CATEGORIES,
  APPROVAL_STATUS,
  DOCUMENT_TYPES,
  NOTIFICATION_TYPES,
  EQUIPMENT_AVAILABILITY,
};
