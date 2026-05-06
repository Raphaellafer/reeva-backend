export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'LODGING' | 'PURCHASE';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'PIX'
  | 'CORPORATE_CARD'
  | 'OTHER';

export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AI_APPROVED'
  | 'PENDING_REVIEW'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'FINANCE_APPROVED'
  | 'FINANCE_REJECTED'
  | 'PAID'
  | 'CANCELLED'
  | 'NEEDS_REVISION'
  | 'OCR_FAILED';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'FINANCE' | 'ADMIN';

export type AiDecision =
  | 'AUTO_APPROVED'
  | 'READY_FOR_MANAGER'
  | 'NEEDS_EMPLOYEE_CORRECTION'
  | 'REJECTED_BY_POLICY'
  | 'PENDING_MANUAL_REVIEW';

export type SefazStatus =
  | 'NOT_APPLICABLE'
  | 'PENDING'
  | 'VALID'
  | 'INVALID'
  | 'UNAVAILABLE';

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface StatusHistoryItem {
  fromStatus: ExpenseStatus | null;
  toStatus: ExpenseStatus;
  notes: string;
  changedAt: string;
}

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
}

export interface ExpenseResponse {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  amount: number | null;
  currency: string;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  status: ExpenseStatus;
  aiScore: number | null;
  aiAlertLevel: string | null;
  aiAnalysis: string | null;
  aiDecision: AiDecision | null;
  aiDecisionReason: string | null;
  policyCompliant: boolean | null;
  policyViolationReason: string | null;
  sefazStatus: SefazStatus | null;
  sefazValidationMessage: string | null;
  autoApprovalEligible: boolean;
  manualReviewReason: string | null;
  ocrData: string | null;
  attachments: AttachmentItem[];
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResponse {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  needsRevisionCount: number;
  approvedTotalAmount: number;
  teamSize: number;
  autoApprovedCount: number;
  policyViolationCount: number;
  manualReviewCount: number;
  estimatedSavingsAmount: number;
  automationRate: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  errors: string[];
}

export interface TeamMemberResponse {
  id: string;
  name: string;
  email: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  revenue: number | null;
  active: boolean;
  members: TeamMemberResponse[];
}

export interface ProjectPayload {
  name: string;
  code?: string;
  description?: string;
  revenue?: number;
  memberIds: string[];
}

export interface PolicyResponse {
  id: string;
  category: ExpenseCategory;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  requiresReceipt: boolean;
  minAutoApprovalScore: number;
}

export interface PolicyPayload {
  category: ExpenseCategory;
  dailyLimit?: number;
  monthlyLimit?: number;
  requiresReceipt: boolean;
  minAutoApprovalScore: number;
}

export interface PolicyAuditLogResponse {
  id: string;
  userId: string;
  userName: string;
  action: string;
  changedAt: string;
}

export interface EmployeePayment {
  userId: string;
  userName: string;
  pixKey: string | null;
  totalAmount: number;
  expenseCount: number;
}

export interface PaymentBatchResponse {
  totalAmount: number;
  employeeCount: number;
  payments: EmployeePayment[];
}

export interface ProjectFinancialEntry {
  id: string;
  description: string;
  amount: number;
  entryDate: string;
  type: string;
}

export interface ProjectPerformanceResponse {
  projectId: string;
  projectName: string;
  totalExpenses: number;
  approvedExpenses: number;
  revenue: number | null;
  roi: number | null;
}

// ── Employee (manager view) ───────────────────────────────────────

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  department: string | null;
  pendingCount: number;
  approvedCount: number;
  totalReimbursed: number;
  createdAt: string;
}

export interface EmployeeProfile extends EmployeeListItem {
  recentExpenses: ExpenseResponse[];
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  departmentId?: string;
}
