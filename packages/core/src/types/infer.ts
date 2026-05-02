import { Field } from '../interfaces/field'

export type Infer<F extends Field> = F['_output']
export type InferInput<F extends Field> = F['_input']

export type ObjectOutput<T extends Record<string, Field>> = {
  [K in keyof T as undefined extends T[K]['_output'] ? never : K]: T[K]['_output']
} & {
  [K in keyof T as undefined extends T[K]['_output'] ? K : never]?: T[K]['_output']
}

export type ObjectInput<T extends Record<string, Field>> = {
  [K in keyof T as undefined extends T[K]['_input'] ? never : K]: T[K]['_input']
} & {
  [K in keyof T as undefined extends T[K]['_input'] ? K : never]?: T[K]['_input']
}

export type InferElementOutputs<Arr extends ReadonlyArray<Field>> = {
  [K in keyof Arr]: Arr[K] extends Field ? Arr[K]['_output'] : never
}

export type InferElementInputs<Arr extends ReadonlyArray<Field>> = {
  [K in keyof Arr]: Arr[K] extends Field ? Arr[K]['_input'] : never
}
