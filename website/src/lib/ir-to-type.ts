import type { SapphireSchemaNode } from '@ascendance-hub/sapphire-core'

/**
 * Renders a SapphireSchemaNode as a readable TypeScript-type string.
 * The IR fully determines the inferred type, so this is a faithful stand-in
 * for `Infer<>` — which cannot be computed at runtime because TS types erase.
 */
export function irToTypeString(node: SapphireSchemaNode): string {
  let base: string
  switch (node.kind) {
    case 'string':
      base = 'string'
      break
    case 'number':
      base = 'number'
      break
    case 'boolean':
      base = 'boolean'
      break
    case 'date':
      base = 'Date'
      break
    case 'literal':
      base = JSON.stringify(node.value)
      break
    case 'enum':
      base = node.values.map((v) => JSON.stringify(v)).join(' | ')
      break
    case 'array':
      base = `${wrapForArray(node.items)}[]`
      break
    case 'tuple':
      base = `[${node.items.map(irToTypeString).join(', ')}]`
      break
    case 'union':
      base = node.options.map(irToTypeString).join(' | ')
      break
    case 'record':
      base = `Record<${irToTypeString(node.keys)}, ${irToTypeString(node.values)}>`
      break
    case 'ref':
      base = node.target
      break
    case 'object': {
      const entries = Object.entries(node.properties).map(([key, child]) => {
        const opt = child.required ? '' : '?'
        return `${key}${opt}: ${irToTypeString(child)}`
      })
      base = entries.length > 0 ? `{ ${entries.join('; ')} }` : '{}'
      break
    }
  }
  if (node.nullable) base = `${base} | null`
  return base
}

/**
 * Parenthesizes an array element type only when it is a bare top-level union
 * (`a | b` → `(a | b)[]`). Object, tuple, and primitive items need no parens.
 */
function wrapForArray(node: SapphireSchemaNode): string {
  const s = irToTypeString(node)
  const isTopLevelUnion =
    Boolean(node.nullable) ||
    (node.kind === 'union' && node.options.length > 1) ||
    (node.kind === 'enum' && node.values.length > 1)
  return isTopLevelUnion ? `(${s})` : s
}
