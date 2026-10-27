export interface TableField {
  name: string
  type: string
  description?: string
}

export interface CandidateKey {
  field: string
  uniqueness: number
  selected?: boolean
}

export interface ValidationResultItem {
  field: string
  uniqueness: number
  duplicates: number
}

export interface ValidationResult {
  isValid: boolean
  items: ValidationResultItem[]
  score: number
}

export interface PrimaryKeyConfig {
  primaryKeys: string[]
  keyType: 'PERSON' | 'DEVICE' | 'ENTERPRISE' | 'FAMILY'
}
