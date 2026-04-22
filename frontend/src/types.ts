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
  | 'CANCELLED';

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface StatusHistoryItem {
  fromStatus: ExpenseStatus | null;
  toStatus: ExpenseStatus;
  notes: string;
  changedAt: string;
}

export interface ExpenseResponse {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  status: ExpenseStatus;
  aiScore: number | null;
  aiAlertLevel: string | null;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
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
