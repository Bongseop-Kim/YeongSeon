type CamelToSnakeKeyInternal<
  S extends string,
  IsStart extends boolean,
> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `${IsStart extends true ? "" : "_"}${Lowercase<Head>}`}${CamelToSnakeKeyInternal<Tail, false>}`
  : S;

type CamelToSnakeKey<S extends string> = CamelToSnakeKeyInternal<S, true>;

export type CamelToSnakeCase<T> = T extends readonly []
  ? T
  : T extends readonly [unknown, ...unknown[]]
    ? { [K in keyof T]: CamelToSnakeCase<T[K]> }
    : T extends readonly (infer U)[]
      ? readonly CamelToSnakeCase<U>[]
      : T extends object
        ? {
            [K in keyof T as K extends string
              ? CamelToSnakeKey<K>
              : K]: CamelToSnakeCase<T[K]>;
          }
        : T;
