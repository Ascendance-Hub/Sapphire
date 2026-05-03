import {
  ArrayField,
  BooleanField,
  DateField,
  NumberField,
  ObjectField,
  RefField,
  StringField,
  TupleField,
  TypeField,
} from '../core'
import { Field } from '../interfaces/field'
import { NamedSchemaRegistry } from './named-registry'
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
  private readonly namedSchemas: NamedSchemaRegistry

  constructor(opts?: SapphireOptions) {
    this.defaultAdapter = opts?.defaultAdapter
    this.namedSchemas = new NamedSchemaRegistry()
    this.instanceOpts = {
      messages: opts?.messages,
      abortEarly: opts?.abortEarly,
      stripUnknown: opts?.stripUnknown,
      namedSchemas: this.namedSchemas,
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

  array<F extends Field>(item: F): ArrayField<F> {
    return new ArrayField(item, this.defaultAdapter, this.instanceOpts)
  }

  tuple<T extends ReadonlyArray<Field>>(items: T): TupleField<T> {
    return new TupleField<T>(items, this.defaultAdapter, this.instanceOpts)
  }

  object<Obj extends Record<string, Field>>(obj: Obj): ObjectField<Obj> {
    return new ObjectField<Obj>(obj, this.defaultAdapter, this.instanceOpts)
  }

  type(): TypeField {
    return new TypeField(this.defaultAdapter, this.instanceOpts)
  }

  ref(target: ObjectField<Record<string, Field>> | string): RefField {
    return new RefField(target, this.defaultAdapter, this.instanceOpts)
  }

  /**
   * Returns the list of registered named schemas in this instance.
   * Mostly useful for tests/debugging.
   */
  listNamedSchemas(): string[] {
    return this.namedSchemas.list()
  }
}
