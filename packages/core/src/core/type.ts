import { Field } from '../interfaces/field'
import type { InstanceOptions } from '../lib/types'
import { LiteralField, type LiteralValue } from './literal'
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
}
