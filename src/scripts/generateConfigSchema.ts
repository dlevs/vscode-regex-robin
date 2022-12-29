import path from "node:path";
import fs from "node:fs/promises";
import { createGenerator } from "ts-json-schema-generator";
import deref from "deref";

main();

/**
 * Generate the config schema from the TypeScript types, and add it to the
 * package.json file.
 *
 * This makes the TypeScript types the source of truth, and is generally
 * much nicer to work with than manually defining JSON schemas.
 *
 * Also, it allows us to reuse the built-in vscode built-in, we get all of
 * those descriptions for free.
 */
async function main() {
  const packageJsonPath = path.join(__dirname, "../../package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

  const schema = createGenerator({
    path: path.join(__dirname, "../config.ts"),
    tsconfig: path.join(__dirname, "../../tsconfig.json"),
    type: "Rule",
  }).createSchema("Rule");

  // Remove version, since `deref` throws an error because it does not like the
  // version outputted by `ts-json-schema-generator`.
  delete schema.$schema;

  const dereferencedSchema = deref()(schema);

  packageJson.contributes.configuration = {
    title: "Regex Robin",
    type: "object",
    // TODO: Do this from root, not from "Rule"
    properties: {
      "regexrobin.rules": {
        type: "array",
        items: dereferencedSchema.definitions?.Rule,
      },
    },
  };

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}
