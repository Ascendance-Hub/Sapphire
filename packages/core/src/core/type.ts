import { Field } from '../interfaces/field'
import { ORM } from '../types/orm'
import { ObjectField } from './object'
import { UnionField } from './union'

export class TypeField {
  constructor(private readonly defaultOrm?: ORM) {}

  union<Fields extends Field[]>(fields: Fields): UnionField<Fields, false> {
    return new UnionField(fields, this.defaultOrm)
  }

  pick<T extends Record<string, Field>, K extends readonly (keyof T)[]>(
    objectField: ObjectField<T, any>,
    keys: K,
  ): ObjectField<Pick<T, K[number]>, false> {
    const sourceObj = objectField.getObj()
    const pickedObj = Object.fromEntries(keys.map((key) => [key, sourceObj[key]])) as Pick<
      T,
      K[number]
    >
    return new ObjectField(pickedObj, this.defaultOrm)
  }
}
