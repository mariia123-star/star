export interface Material {
  id: string
  code: string
  name: string
  description?: string
  category: string
  rate_category?: string // Категория расценки для автоматической связи с расценками
  unit_id: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaterialCreate {
  code: string
  name: string
  description?: string
  category: string
  rate_category?: string // Категория расценки для автоматической связи с расценками
  unit_id: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active?: boolean
}

export interface MaterialUpdate {
  code?: string
  name?: string
  description?: string
  category?: string
  rate_category?: string // Категория расценки для автоматической связи с расценками
  unit_id?: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active?: boolean
}

export interface MaterialWithUnit extends Material {
  unit_name: string
  unit_short_name: string
}

export interface MaterialImportRow {
  code: string
  name: string
  description?: string
  category: string
  unit_name: string
  unit_id?: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active?: boolean
}
