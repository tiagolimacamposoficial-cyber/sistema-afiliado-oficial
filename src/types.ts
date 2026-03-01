import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'affiliate';
  balance: number;
  whatsapp?: string;
  pix?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  commission_rate: number;
  purchase_url: string;
  image_url: string;
  active: number;
}

export interface Affiliate {
  id: number;
  name: string;
  email: string;
  password?: string;
  balance: number;
  whatsapp?: string;
  pix?: string;
  created_at: string;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  user_name?: string;
  user_pix?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  whatsapp: string;
  product_name: string;
  affiliate_name?: string;
  created_at: string;
}

export interface SystemSettings {
  system_name: string;
  min_withdrawal: string;
  default_commission: string;
  support_email: string;
  allow_deletion: string;
  auto_approve_withdrawals: string;
}

export interface AffiliateStats {
  balance: number;
  totalSales: number;
  totalCommission: number;
  totalClicks: number;
  chartData: {
    date: string;
    clicks: number;
    sales: number;
  }[];
}
