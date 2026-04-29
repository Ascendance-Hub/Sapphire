export type SapphireSchemaNode =
  | { kind: 'string'; required: boolean; minLength?: number }
  | { kind: 'number'; required: boolean }
  | { kind: 'boolean'; required: boolean }
  | { kind: 'date'; required: boolean }
  | { kind: 'object'; required: boolean; properties: Record<string, SapphireSchemaNode> }
  | { kind: 'array'; required: boolean; items: SapphireSchemaNode[] }
  | { kind: 'union'; required: boolean; options: SapphireSchemaNode[] }
