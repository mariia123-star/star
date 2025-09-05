export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface Project extends BaseEntity {
  name: string
  description: string | null
}

export interface Block extends BaseEntity {
  name: string
  project_id: string
}

export interface CostCategory extends BaseEntity {
  name: string
  code?: string
}

export interface DetailCostCategory extends BaseEntity {
  name: string
  cost_category_id: string
}

export interface Location extends BaseEntity {
  name: string
  code?: string
}

export interface Unit extends BaseEntity {
  name: string
  short_name?: string
}

export interface ChessboardItem extends BaseEntity {
  material?: string
  quantity?: number
  unit?: string
  project_id?: string
  block_id?: string
  cost_category_id?: string
  cost_type_id?: string
  location_id?: string
  row_color?: string
  document_section?: string
  document_code?: string
}

export interface Documentation extends BaseEntity {
  title: string
  content?: string
  file_path?: string
  file_size?: number
  mime_type?: string
  project_id?: string
}

export interface Rate extends BaseEntity {
  name: string
  rate_value: number
  unit?: string
  cost_category_id?: string
}

export interface ChessboardMapping {
  id: string
  chessboard_id: string
  entity_type: string
  entity_id: string
  mapping_type: string
}

export interface EntityComment {
  id: string
  entity_type: string
  entity_id: string
  comment_text: string
  author_id?: string
  comment_date: string
}

export type RowColor = 'green' | 'yellow' | 'blue' | 'red'

export interface FilterState {
  project_id?: string
  block_id?: string[]
  cost_category_id?: string[]
  cost_type_id?: string[]
  location_id?: string[]
  document_section?: string[]
  document_code?: string[]
}

export interface TableMode {
  mode: 'view' | 'add' | 'edit' | 'delete'
  selectedRows?: string[]
}