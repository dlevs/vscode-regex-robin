import type { CompiledTemplate } from "../types/config";
import { parseTemplate, TemplateNode } from "./parseTemplate";
import { argNames, getArgs } from "./templateArgs";

export function compileTemplate<T extends string | undefined>(
  template: T
): T extends string ? CompiledTemplate : undefined;
export function compileTemplate(
  template?: string
): CompiledTemplate | undefined {
  if (template == null) {
    return template;
  }

  const components = parseTemplate(template).map(compileTemplateComponent);

  return function populateTemplate(match) {
    return components.map((process) => process(match)).join("");
  };
}

function compileTemplateComponent(node: TemplateNode): CompiledTemplate {
  switch (node.type) {
    case "text":
      return () => node.value;
    case "expression": {
      let template: (...args: unknown[]) => string;
      try {
        template = Function(...argNames, `return ${node.value}`) as any;
      } catch (err) {
        template = () => `[ERROR: ${(err as Error).message}]`;
      }
      return (match) => {
        try {
          // TODO: Works in multi-workspace project?
          const args = getArgs(match);
          return template(...args);
        } catch (err) {
          console.log(err);
          return `[ERROR: ${(err as Error).message}]`;
        }
      };
    }
    default:
      throw new SyntaxError("Unexpected node type: " + node.type);
  }
}
