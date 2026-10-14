export interface SalesRecord {
  id: string;
  date: string;
  product: string;
  category: string;
  quantity: number;
  price: number;
  total: number;
  salesperson: string;
  region: string;
  status?: string;
  rawData: string[];
}

export interface SalesKPIs {
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalQuantity: number;
  topCategory: { name: string; value: number };
  topProduct: { name: string; value: number };
  topSalesperson: { name: string; value: number };
}

export interface CategoryBreakdown {
  category: string;
  sales: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: string; // e.g., "Jan", "Feb" or "Jan 2026"
  sales: number;
  transactions: number;
  quantity: number;
}

export interface ProductPerformance {
  product: string;
  sales: number;
  quantity: number;
  category: string;
}

export interface SalespersonPerformance {
  name: string;
  sales: number;
  transactions: number;
}

export interface RegionBreakdown {
  region: string;
  sales: number;
  percentage: number;
}

export interface SheetMeta {
  title: string;
  sheetId: number;
}

export interface TargetData {
  psm: number;
  serba: number;
  pwp: number;
  seger: number;
  rtd: number;
  total: number;
  ceban?: number;
  telur?: number;
  toys?: number;
  new_member?: number;
  bootle?: number;
  targetsByDate?: Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; total: number; ceban?: number; telur?: number; toys?: number; new_member?: number; bootle?: number }>;
  targetsByStoreAndDate?: Record<string, Record<string, { psm: number; serba: number; pwp: number; seger: number; rtd: number; total: number; ceban?: number; telur?: number; toys?: number; new_member?: number; bootle?: number }>>;
}

