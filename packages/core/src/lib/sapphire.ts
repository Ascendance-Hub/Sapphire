import {
  ArrayField,
  BooleanField,
  DateField,
  NumberField,
  ObjectField,
  StringField,
  TypeField,
} from '../core'
import { Field } from '../interfaces/field'
import { ORM } from '../types/orm'

export interface SapphireOptions {
  defaultOrm?: ORM
}

export class Sapphire {
  private readonly defaultOrm?: ORM

  constructor(opts?: SapphireOptions) {
    this.defaultOrm = opts?.defaultOrm
  }

  string(): StringField {
    return new StringField(this.defaultOrm)
  }

  number(): NumberField {
    return new NumberField(this.defaultOrm)
  }

  boolean(): BooleanField {
    return new BooleanField(this.defaultOrm)
  }

  date(): DateField {
    return new DateField(this.defaultOrm)
  }

  array<Arr extends Array<Field>>(arr: Arr): ArrayField<Arr> {
    return new ArrayField(arr, this.defaultOrm)
  }

  object<Obj extends Record<string, Field>>(obj: Obj): ObjectField<Obj> {
    return new ObjectField<Obj>(obj, this.defaultOrm)
  }

  type(): TypeField {
    return new TypeField(this.defaultOrm)
  }
}
