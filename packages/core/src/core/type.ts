import { Field } from '../interfaces/field'
import type { InstanceOptions, MessageValue } from '../lib/types'
import { EnumField, type EnumValue, extractEnumValues } from './enum'
import { LiteralField, type LiteralValue } from './literal'
import { RecordField } from './record'
import { UnionField } from './union'

/** I1: per-rule message option for terminal codes that previously had no
 *  customization path (`enum`, `literal`, `union_no_match`). */
export interface TerminalRuleOptions {
  message?: MessageValue
}

export class TypeField {
  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
  ) {}

  union<Fields extends Field[]>(fields: Fields, opts?: TerminalRuleOptions): UnionField<Fields> {
    return new UnionField(fields, this.defaultAdapter, this.instanceOpts, {
      required: true,
      ...(opts?.message !== undefined ? { ruleMessages: { union_no_match: opts.message } } : {}),
    })
  }

  literal<V extends LiteralValue>(value: V, opts?: TerminalRuleOptions): LiteralField<V> {
    return new LiteralField<V>(value, this.defaultAdapter, this.instanceOpts, {
      required: true,
      ...(opts?.message !== undefined ? { ruleMessages: { literal: opts.message } } : {}),
    })
  }

  enum<const T extends ReadonlyArray<EnumValue>>(
    values: T,
    opts?: TerminalRuleOptions,
  ): EnumField<T[number]>
  enum<T extends Record<string, EnumValue>>(
    tsEnum: T,
    opts?: TerminalRuleOptions,
  ): EnumField<T[keyof T] extends EnumValue ? T[keyof T] : never>
  enum(input: unknown, opts?: TerminalRuleOptions): EnumField<EnumValue> {
    const values = extractEnumValues(input)
    return new EnumField<EnumValue>(values, this.defaultAdapter, this.instanceOpts, {
      required: true,
      ...(opts?.message !== undefined ? { ruleMessages: { enum: opts.message } } : {}),
    })
  }

  record<K extends Field, V extends Field>(keyField: K, valueField: V): RecordField<K, V> {
    return new RecordField<K, V>(keyField, valueField, this.defaultAdapter, this.instanceOpts)
  }
}
