export interface ForeignKeyRef {
  referencedTable: string
  referencedColumn: string
  constraintName?: string | null
}

export interface ColumnMetadata {
  name: string
  type: string
  length?: number | null
  precision?: number | null
  scale?: number | null
  nullable: boolean
  primaryKey: boolean
  autoIncrement: boolean
  unique: boolean
  defaultValue?: string | null
  comment?: string | null
  foreignKey?: ForeignKeyRef | null
}

export interface IndexMetadata {
  name: string
  columns: string[]
  unique: boolean
}

export interface ErdTable {
  id: string
  name: string
  schema?: string | null
  x: number
  y: number
  color: string
  columns: ColumnMetadata[]
  indexes: IndexMetadata[]
}

export interface ErdRelationship {
  id: string
  sourceTableId: string
  sourceColumnName: string
  targetTableId: string
  targetColumnName: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  constraintName?: string | null
}

export interface ErdData {
  tables: ErdTable[]
  relationships: ErdRelationship[]
}

export interface ProjectSummary {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: number
  name: string
  description: string
  erdData: ErdData
  createdAt: string
  updatedAt: string
}
