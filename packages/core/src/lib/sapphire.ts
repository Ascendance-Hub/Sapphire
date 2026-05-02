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
import type { FieldMessages, InstanceOptions } from './types'

export interface SapphireOptions {
  defaultOrm?: ORM
  messages?: FieldMessages
  abortEarly?: boolean
  stripUnknown?: boolean
}

export class Sapphire {
  private readonly defaultOrm?: ORM
  private readonly instanceOpts: InstanceOptions

  constructor(opts?: SapphireOptions) {
    this.defaultOrm = opts?.defaultOrm
    this.instanceOpts = {
      messages: opts?.messages,
      abortEarly: opts?.abortEarly,
      stripUnknown: opts?.stripUnknown,
    }
  }

  string(): StringField {
    return new StringField(this.defaultOrm, this.instanceOpts)
  }

  number(): NumberField {
    return new NumberField(this.defaultOrm, this.instanceOpts)
  }

  boolean(): BooleanField {
    return new BooleanField(this.defaultOrm, this.instanceOpts)
  }

  date(): DateField {
    return new DateField(this.defaultOrm, this.instanceOpts)
  }

  array<Arr extends Array<Field>>(arr: Arr): ArrayField<Arr> {
    return new ArrayField(arr, this.defaultOrm, this.instanceOpts)
  }

  object<Obj extends Record<string, Field>>(obj: Obj): ObjectField<Obj> {
    return new ObjectField<Obj>(obj, this.defaultOrm, this.instanceOpts)
  }

  type(): TypeField {
    return new TypeField(this.defaultOrm, this.instanceOpts)
  }
}
