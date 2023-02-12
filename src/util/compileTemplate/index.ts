import nearley from "nearley";
import rawGrammar, { type TemplateNode } from "./grammar";

type MatchProcessor = (matches: string[]) => string;

const grammar = nearley.Grammar.fromCompiled(rawGrammar);
const ARGUMENT_PLACEHOLDER = Symbol("placeholder");

export function compileTemplate(template: string) {
  const parser = new nearley.Parser(grammar);
  parser.feed(template);
  const nodes: TemplateNode[] = parser.results[0];
  const matchProcessors = nodes.map(processNode);

  return function populateTemplate(matches: string[]) {
    return matchProcessors.map((processor) => processor(matches)).join("");
  };
}

function processNode(node: TemplateNode): MatchProcessor {
  switch (node.type) {
    case "text":
      return () => node.value;
    case "template":
      return createTemplateMatcher(node);
    default:
      // @ts-expect-error - exhaustive switch
      throw new SyntaxError("Unexpected node type: " + node.type);
  }
}

function createTemplateMatcher(
  node: Extract<TemplateNode, { type: "template" }>
): MatchProcessor {
  const { value } = node;
  const subjectType = /\d+/.test(value)
    ? "matchIndex"
    : /^env:/.test(value)
    ? "envVariable"
    : "variable";

  const getSubject: MatchProcessor =
    subjectType === "matchIndex"
      ? (matches) => matches[Number(value)] ?? ""
      : subjectType === "envVariable"
      ? () => process.env[value] ?? ""
      : () => "TODO";

  const transforms = node.transforms.map((transform) => ({
    ...transform,
    method: getMethodFromName(transform.methodName),
  }));

  return function processMatches(matches) {
    let output: string | number = getSubject(matches);

    for (const transform of transforms) {
      const args = transform.args.map((arg: any) => {
        // TODO:Allow like ${process.env.NODE_ENV:replace(/dev/, 'development')}?
        if (
          arg != null &&
          typeof arg === "object" &&
          "type" in arg &&
          arg.type === "identifier"
        ) {
          if (arg.value === "_") {
            return ARGUMENT_PLACEHOLDER;
          }
          return globalThis[arg.value];
        }

        return arg;
      });
      output = transform.method.apply(output, args);
    }

    return String(output);
  };
}

function getMethodFromName(
  methodName: string
): (...args: unknown[]) => string | number {
  if (methodName in String.prototype) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return String.prototype[methodName];
  } else if (methodName in Number.prototype) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Number.prototype[methodName];
  } else if (methodName in Math) {
    return function mathFunction(this: string, ...args: unknown[]) {
      const mathArguments =
        args.length === 0
          ? [Number(this)]
          : args.map((arg) =>
              arg === ARGUMENT_PLACEHOLDER ? Number(this) : Number(arg)
            );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return Math[methodName](...mathArguments);
    };
  }

  throw new SyntaxError("Unknown method: " + methodName);
}
