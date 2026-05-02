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
import type { FieldMessages, InstanceOptions } from './types'

export interface SapphireOptions {
  defaultAdapter?: string
  messages?: FieldMessages
  abortEarly?: boolean
  stripUnknown?: boolean
}

export class Sapphire {
  private readonly defaultAdapter?: string
  private readonly instanceOpts: InstanceOptions

  constructor(opts?: SapphireOptions) {
    this.defaultAdapter = opts?.defaultAdapter
    this.instanceOpts = {
      messages: opts?.messages,
      abortEarly: opts?.abortEarly,
      stripUnknown: opts?.stripUnknown,
    }
  }

  string(): StringField {
    return new StringField(this.defaultAdapter, this.instanceOpts)
  }

  number(): NumberField {
    return new NumberField(this.defaultAdapter, this.instanceOpts)
  }

  boolean(): BooleanField {
    return new BooleanField(this.defaultAdapter, this.instanceOpts)
  }

  date(): DateField {
    return new DateField(this.defaultAdapter, this.instanceOpts)
  }

  array<Arr extends Array<Field>>(arr: Arr): ArrayField<Arr> {
    return new ArrayField(arr, this.defaultAdapter, this.instanceOpts)
  }

  object<Obj extends Record<string, Field>>(obj: Obj): ObjectField<Obj> {
    return new ObjectField<Obj>(obj, this.defaultAdapter, this.instanceOpts)
  }

  type(): TypeField {
    return new TypeField(this.defaultAdapter, this.instanceOpts)
  }
}
