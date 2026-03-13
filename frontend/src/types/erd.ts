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

export interface DbConnection {
  id?: number
  name: string
  type: string
  host?: string | null
  port?: number | null
  database?: string | null
  username?: string | null
  password?: string | null
  ssl: boolean
}

export interface VersionSummary {
  id: number
  projectId: number
  versionNumber: number
  message: string
  createdBy: number
  createdAt: string
}

export interface VersionDetail extends VersionSummary {
  erdData: ErdData
}

export interface ColumnDiff {
  columnName: string
  before: ColumnMetadata
  after: ColumnMetadata
}

export interface TableDiff {
  tableId: string
  tableName: string
  addedColumns: ColumnMetadata[]
  removedColumns: ColumnMetadata[]
  modifiedColumns: ColumnDiff[]
}

export interface SchemaDiff {
  addedTables: ErdTable[]
  removedTables: ErdTable[]
  modifiedTables: TableDiff[]
  addedRelationships: ErdRelationship[]
  removedRelationships: ErdRelationship[]
}

export interface DictionaryEntry {
  id?: number
  projectId: number
  tableName: string
  columnName?: string | null
  description?: string | null
  dataStandard?: string | null
  domain?: string | null
  example?: string | null
  updatedAt?: string
}
