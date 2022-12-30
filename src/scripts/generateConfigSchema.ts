import path from "node:path";
import fs from "node:fs/promises";
import { createGenerator } from "ts-json-schema-generator";
import deref from "deref";
import { isPlainObject } from "lodash";

main();

const SCHEMA_TYPE_NAME = "VSCodeConfigForSchemaGeneration";

/**
 * Generate the config schema from the TypeScript types, and add it to the
 * package.json file.
 *
 * This makes the TypeScript types the source of truth, and is generally
 * much nicer to work with than manually defining JSON schemas.
 *
 * Also, it allows us to reuse the built-in vscode built-in, we get all of
 * those descriptions for free.
 *
 * TODO: This could be extracted into another package that exposes a CLI,
 * like `vscode-config-gen --source src/config.ts.
 */
async function main() {
  const packageJsonPath = path.join(__dirname, "../../package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

  const schema = createGenerator({
    path: path.join(__dirname, "../config.ts"),
    tsconfig: path.join(__dirname, "../../tsconfig.json"),
    type: SCHEMA_TYPE_NAME,
    skipTypeCheck: true,
  }).createSchema(SCHEMA_TYPE_NAME);

  // Remove version, since `deref` throws an error because it does not like the
  // version outputted by `ts-json-schema-generator`.
  delete schema.$schema;

  const dereferencedSchema = deref()(schema);

  packageJson.contributes.configuration = replaceDescriptionsWithMarkdown({
    title: packageJson.contributes.configuration.title,
    type: "object",
    properties: dereferencedSchema.definitions[SCHEMA_TYPE_NAME].properties,
  });

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// TODO: Test
/**
 * Replaces `description` with `markdownDescription` in the given object,
 * recursively.
 */
function replaceDescriptionsWithMarkdown(value: unknown): unknown {
  if (value instanceof Array) {
    return value.map(replaceDescriptionsWithMarkdown);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as any).map(([key, value]) => {
        if (key === "description") {
          return ["markdownDescription", value];
        }

        return [key, replaceDescriptionsWithMarkdown(value)];
      })
    );
  }

  return value;
}
