import { Field } from '../interfaces/field'
import type { InstanceOptions } from '../lib/types'
import { ORM } from '../types/orm'
import { ObjectField } from './object'
import { UnionField } from './union'

export class TypeField {
  constructor(
    private readonly defaultOrm?: ORM,
    private readonly instanceOpts?: InstanceOptions,
  ) {}

  union<Fields extends Field[]>(fields: Fields): UnionField<Fields> {
    return new UnionField(fields, this.defaultOrm, this.instanceOpts)
  }

  pick<T extends Record<string, Field>, K extends readonly (keyof T)[]>(
    objectField: ObjectField<T>,
    keys: K,
  ): ObjectField<Pick<T, K[number]>> {
    const sourceObj = objectField.getObj()
    const pickedObj = Object.fromEntries(keys.map((key) => [key, sourceObj[key]])) as Pick<
      T,
      K[number]
    >
    return new ObjectField(pickedObj, this.defaultOrm, this.instanceOpts)
  }
}
