export type UserRole = "VIEWER" | "ANALYST" | "ADMIN"
export type TransactionType = "INCOME" | "EXPENSE"

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  color_hex: string
  icon: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: string
  type: TransactionType
  category_id: string | null
  category_name: string | null
  date: string
  notes: string | null
  created_by: string
  deleted_at: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface DashboardSummary {
  total_income: string
  total_expenses: string
  net_balance: string
  transaction_count: number
}

export interface MonthlyTrend {
  month: string
  income: string
  expenses: string
  net: string
}

export interface CategoryBreakdown {
  category_name: string
  total: string
  percentage: number
  color_hex: string
}

export interface RecentTransaction {
  id: string
  amount: string
  type: TransactionType
  category_name: string | null
  date: string
  notes: string | null
}

export interface DashboardResponse {
  summary: DashboardSummary
  category_breakdown: CategoryBreakdown[]
  monthly_trend: MonthlyTrend[]
  recent_transactions: RecentTransaction[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
