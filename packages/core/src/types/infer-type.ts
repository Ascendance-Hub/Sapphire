import {
  ArrayField,
  BooleanField,
  DateField,
  NumberField,
  ObjectField,
  StringField,
  UnionField,
} from '../core'
import { Field } from '../interfaces/field'

type InferArraySchema<T extends Array<any>> = T extends (infer U)[]
  ? U extends Record<string, Field>
    ? InferSchema<U>[]
    : U extends Field
      ? InferFieldType<U>[]
      : never
  : never

type InferFieldType<F> =
  F extends StringField<infer IsOpt extends boolean>
    ? IsOpt extends true
      ? string | undefined
      : string
    : F extends NumberField<infer IsOpt extends boolean>
      ? IsOpt extends true
        ? number | undefined
        : number
      : F extends BooleanField<infer IsOpt extends boolean>
        ? IsOpt extends true
          ? boolean | undefined
          : boolean
        : F extends DateField<infer IsOpt extends boolean>
          ? IsOpt extends true
            ? Date | undefined
            : Date
          : F extends ArrayField<infer Arr, infer IsOpt extends boolean>
            ? IsOpt extends true
              ? InferArraySchema<Arr> | undefined
              : InferArraySchema<Arr>
            : F extends ObjectField<infer Obj, infer IsOpt extends boolean>
              ? IsOpt extends true
                ? InferSchema<Obj> | undefined
                : InferSchema<Obj>
              : F extends UnionField<infer Fields extends Field[], infer IsOpt extends boolean>
                ? IsOpt extends true
                  ? InferFieldType<Fields[number]> | undefined
                  : InferFieldType<Fields[number]>
                : never

type IsOptionalField<F> =
  F extends StringField<infer O>
    ? O extends true
      ? true
      : false
    : F extends NumberField<infer O>
      ? O extends true
        ? true
        : false
      : F extends BooleanField<infer O>
        ? O extends true
          ? true
          : false
        : F extends DateField<infer O>
          ? O extends true
            ? true
            : false
          : F extends ArrayField<any, infer O>
            ? O extends true
              ? true
              : false
            : F extends ObjectField<any, infer O>
              ? O extends true
                ? true
                : false
              : F extends UnionField<any, infer O>
                ? O extends true
                  ? true
                  : false
                : false

export type InferSchema<T> = {
  [K in keyof T as IsOptionalField<T[K]> extends true ? K : never]?: InferFieldType<T[K]>
} & {
  [K in keyof T as IsOptionalField<T[K]> extends false ? K : never]: InferFieldType<T[K]>
}
