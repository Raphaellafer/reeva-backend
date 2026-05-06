export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'LODGING' | 'PURCHASE' | 'HARDWARE';

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
  | 'NEEDS_REVISION';

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
  projectId: string;
  projectName: string;
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

export interface PolicyResponse {
  id: string;
  category: ExpenseCategory;
  maxAmount: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  requiresReceipt: boolean;
  autoApprovalMinScore: number;
  description: string | null;
}

export interface PolicyPayload {
  category: ExpenseCategory;
  maxAmount: string;
  dailyLimit: string | null;
  monthlyLimit: string | null;
  requiresReceipt: boolean;
  autoApprovalMinScore: number;
  description: string;
}

export interface PolicyAuditLogResponse {
  id: string;
  action: 'POLICY_CREATED' | 'POLICY_UPDATED' | 'POLICY_REACTIVATED' | string;
  policyId: string;
  changedByUserId: string;
  changedByName: string | null;
  category: ExpenseCategory | string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changedAt: string;
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
  code: string;
  description: string;
  revenue: string | null;
  employeeIds: string[];
}

export interface TeamMemberResponse {
  id: string;
  name: string;
  email: string;
}

export interface PaymentExpense {
  id: string;
  title: string;
  projectName: string | null;
  expenseDate: string;
  amount: number;
  autoApproved: boolean;
}

export interface EmployeePayment {
  userId: string;
  name: string;
  email: string;
  pixKey: string;
  totalAmount: number;
  expenses: PaymentExpense[];
}

export interface PaymentBatchResponse {
  from: string | null;
  to: string | null;
  totalAmount: number;
  employeeCount: number;
  expenseCount: number;
  employees: EmployeePayment[];
}

export interface ProjectMonthlyTrendResponse {
  month: string;
  revenue: number;
  generalExpenses: number;
  reimbursableExpenses: number;
  totalCost: number;
  profit: number;
}

export interface ProjectPerformanceResponse {
  projectId: string;
  projectName: string;
  projectCode: string | null;
  revenue: number;
  generalExpenses: number;
  reimbursableExpenses: number;
  totalCost: number;
  profit: number;
  margin: number | null;
  roi: number | null;
  avoidableLosses: number;
  aiSavings: number;
  reimbursedExpenseCount: number;
  totalExpenseCount: number;
  autoApprovedCount: number;
  complianceRate: number;
  autoApprovalRate: number;
  monthlyTrend: ProjectMonthlyTrendResponse[];
}
