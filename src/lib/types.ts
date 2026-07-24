export type Currency = 'USD' | 'ARS'

export type DocumentCategory = 'service_bill' | 'payment_receipt' | 'other'

export type DocumentStatus = 'pending' | 'approved' | 'rejected'

export interface Tenant {
  id: string
  full_name: string
  email: string
  phone: string | null
  property_address: string
  branch: string | null
  created_at: string
}

export interface LeaseContract {
  id: string
  tenant_id: string
  property_address: string
  start_date: string
  end_date: string | null
  currency: Currency
  monthly_amount: number
  active: boolean
  created_at: string
}

export interface RentMonth {
  id: string
  contract_id: string
  tenant_id: string
  period: string
  amount: number
  currency: Currency
  due_date: string
  created_at: string
}

export interface Payment {
  id: string
  tenant_id: string
  rent_month_id: string | null
  amount: number
  currency: Currency
  method: string
  period: string
  registered_by: string
  registered_at: string
  notes: string | null
}

export interface TenantDocument {
  id: string
  tenant_id: string
  rent_month_id: string | null
  category: DocumentCategory
  file_name: string
  file_path: string
  status: DocumentStatus
  period: string
  uploaded_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

export interface TenantWithBalance extends Tenant {
  balance: number
  balance_currency: Currency
  status: 'up_to_date' | 'current_debt' | 'overdue_debt'
  last_payment: Payment | null
  contract: LeaseContract | null
}
