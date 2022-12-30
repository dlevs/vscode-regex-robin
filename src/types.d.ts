/**
 * This module has no type definitions.
 */
declare module "deref" {
  type Deref = (schema: unknown) => any;
  function createDeref(): Deref;
  export = createDeref;
}

/**
 * We're using the "d" flag to get the indices of the match groups.
 *
 * It seems this is not yet included in the TypeScript types, but
 * it's supported in Node 16, which is what VSCode uses at the time
 * of writing.
 */
interface RegExpMatchArray {
  indices?: [number, number][];
}
