import { Sapphire, type SapphireSchemaNode } from '@ascendance-hub/sapphire-core'
import { toJsonSchema } from '@ascendance-hub/sapphire-json-schema'
import { irToTypeString } from './ir-to-type'

type ParseOutcome =
  | { success: true; data: unknown }
  | { success: false; issues: unknown[]; sampleError?: string }

export type PlaygroundResult =
  | {
      ok: true
      ir: SapphireSchemaNode
      typeString: string
      jsonSchema: unknown
      parse: ParseOutcome
    }
  | { ok: false; error: string }

type SafeParseResultLike =
  | { success: true; data: unknown }
  | { success: false; error: { issues: unknown[] } }

interface SchemaField {
  toSchema(): SapphireSchemaNode
  safeParse(value: unknown): SafeParseResultLike
}

/**
 * Evaluates a user-typed Sapphire schema expression and a sample JSON value.
 * Everything runs client-side; the only blast radius is the user's own tab.
 * Never throws — failures are returned as data.
 */
export function evaluatePlayground(schemaCode: string, sampleValueJson: string): PlaygroundResult {
  let field: SchemaField
  try {
    const a = new Sapphire()
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function('a', `return (${schemaCode})`)
    const result = factory(a) as unknown
    if (!result || typeof (result as SchemaField).toSchema !== 'function') {
      return { ok: false, error: 'Expression did not produce a Sapphire field.' }
    }
    field = result as SchemaField
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  let ir: SapphireSchemaNode
  let typeString: string
  try {
    ir = field.toSchema()
    typeString = irToTypeString(ir)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  let jsonSchema: unknown
  try {
    jsonSchema = toJsonSchema(ir)
  } catch (e) {
    jsonSchema = { error: e instanceof Error ? e.message : String(e) }
  }

  let parse: ParseOutcome
  let sampleValue: unknown
  let sampleError: string | undefined
  try {
    sampleValue = JSON.parse(sampleValueJson)
  } catch (e) {
    sampleError = e instanceof Error ? e.message : String(e)
  }
  if (sampleError !== undefined) {
    parse = { success: false, issues: [], sampleError }
  } else {
    try {
      const r = field.safeParse(sampleValue)
      parse = r.success
        ? { success: true, data: r.data }
        : { success: false, issues: r.error.issues }
    } catch (e) {
      parse = {
        success: false,
        issues: [],
        sampleError: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return { ok: true, ir, typeString, jsonSchema, parse }
}
