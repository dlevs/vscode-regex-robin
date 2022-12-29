declare module "deref" {
  type Deref = (schema: unknown) => any;
  function createDeref(): Deref;
  export = createDeref;
}
