type CamelToSnakeKey<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `_${Lowercase<Head>}`}${CamelToSnakeKey<Tail>}`
  : S;

export type CamelToSnakeCase<T> = T extends readonly (infer U)[]
  ? CamelToSnakeCase<U>[]
  : T extends object
    ? {
        [K in keyof T as K extends string
          ? CamelToSnakeKey<K>
          : K]: CamelToSnakeCase<T[K]>;
      }
    : T;
