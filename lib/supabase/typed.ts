import type { SupabaseClient } from '@supabase/supabase-js'

// Type-safe wrapper around supabase.from() since we're not using the Database generic
// (Supabase v2 requires exact schema type format that's complex to hand-write)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function table<Row>(
  supabase: SupabaseClient,
  tableName: string
) {
  // We use unknown intermediate cast since the generic Database type system
  // in Supabase v2 requires a specific schema format with __InternalSupabase key
  return supabase.from(tableName) as unknown as TypedTable<Row>
}

// Minimal typed table builder interface
interface TypedTable<Row> {
  select(columns?: string): TypedQuery<Row>
  insert(values: Partial<Row> | Partial<Row>[], options?: { count?: string }): TypedMutation
  upsert(
    values: Partial<Row> | Partial<Row>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean }
  ): TypedMutation
  update(values: Partial<Row>): TypedQuery<Row>
  delete(): TypedQuery<Row>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TypedQuery<Row> {
  eq(col: string, val: unknown): TypedQuery<Row>
  neq(col: string, val: unknown): TypedQuery<Row>
  in(col: string, vals: unknown[]): TypedQuery<Row>
  or(filter: string): TypedQuery<Row>
  gte(col: string, val: unknown): TypedQuery<Row>
  ilike(col: string, pattern: string): TypedQuery<Row>
  order(col: string, options?: { ascending?: boolean }): TypedQuery<Row>
  limit(n: number): TypedQuery<Row>
  single(): Promise<{ data: Row | null; error: Error | null }>
  maybeSingle(): Promise<{ data: Row | null; error: Error | null }>
  then: Promise<{ data: Row[] | null; error: Error | null }>['then']
}

interface TypedMutation {
  eq(col: string, val: unknown): TypedMutation
  or(filter: string): TypedMutation
  then: Promise<{ data: unknown; error: Error | null }>['then']
}
