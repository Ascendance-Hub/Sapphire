import { Field } from '../interfaces/field'
import type { InstanceOptions } from '../lib/types'
import { EnumField, type EnumValue, extractEnumValues } from './enum'
import { LiteralField, type LiteralValue } from './literal'
import { RecordField } from './record'
import { UnionField } from './union'

export class TypeField {
  constructor(
    private readonly defaultAdapter?: string,
    private readonly instanceOpts?: InstanceOptions,
  ) {}

  union<Fields extends Field[]>(fields: Fields): UnionField<Fields> {
    return new UnionField(fields, this.defaultAdapter, this.instanceOpts)
  }

  literal<V extends LiteralValue>(value: V): LiteralField<V> {
    return new LiteralField<V>(value, this.defaultAdapter, this.instanceOpts)
  }

  enum<const T extends ReadonlyArray<EnumValue>>(values: T): EnumField<T[number]>
  enum<T extends Record<string, EnumValue>>(
    tsEnum: T,
  ): EnumField<T[keyof T] extends EnumValue ? T[keyof T] : never>
  enum(input: unknown): EnumField<EnumValue> {
    const values = extractEnumValues(input)
    return new EnumField<EnumValue>(values, this.defaultAdapter, this.instanceOpts)
  }

  record<K extends Field, V extends Field>(keyField: K, valueField: V): RecordField<K, V> {
    return new RecordField<K, V>(keyField, valueField, this.defaultAdapter, this.instanceOpts)
  }
}
