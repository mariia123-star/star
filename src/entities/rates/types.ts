export interface Rate {
  id: string
  code: string
  name: string
  description?: string
  unit_id: string
  base_price: number
  category: string
  subcategory?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RateCreate {
  code: string
  name: string
  description?: string
  unit_id: string
  base_price: number
  category: string
  subcategory?: string
  is_active?: boolean
}

export interface RateUpdate {
  code?: string
  name?: string
  description?: string
  unit_id?: string
  base_price?: number
  category?: string
  subcategory?: string
  is_active?: boolean
}

export interface RateWithUnit extends Rate {
  unit_name: string
  unit_short_name: string
}
