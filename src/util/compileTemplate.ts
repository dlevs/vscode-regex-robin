import type { CompiledTemplate } from "../types/config";
import { DocumentMatchGroup } from "./documentUtils";

type State = "text" | "expression";

interface TemplateNode {
  type: State;
  value: string;
}

export function compileTemplate(template: string): CompiledTemplate {
  const components = parseTemplate(template).map(compileTemplateComponent);

  return function populateTemplate(match) {
    return components.map((process) => process(match)).join("");
  };
}

// TODO: Just use this everywhere?
class MatchString extends String {
  constructor(private group?: DocumentMatchGroup | null) {
    super(group?.match ?? "");
  }

  get lineNumber() {
    return this.group?.range.start.line ?? -1;
  }

  get columnNumber() {
    return this.group?.range.start.character ?? -1;
  }
}

function compileTemplateComponent(node: TemplateNode): CompiledTemplate {
  switch (node.type) {
    case "text":
      return () => node.value;
    case "expression": {
      const template = Function(
        "$0",
        "$1",
        "$2",
        "$3",
        "$4",
        "$5",
        "$6",
        "$7",
        "$8",
        "$9",
        "lineNumber",
        `return ${node.value}`
      );
      return (match) => {
        const $0 = new MatchString(match.matchGroups[0]);

        const args = [
          $0,
          new MatchString(match.matchGroups[1]),
          new MatchString(match.matchGroups[2]),
          new MatchString(match.matchGroups[3]),
          new MatchString(match.matchGroups[4]),
          new MatchString(match.matchGroups[5]),
          new MatchString(match.matchGroups[6]),
          new MatchString(match.matchGroups[7]),
          new MatchString(match.matchGroups[8]),
          new MatchString(match.matchGroups[9]),
          $0.lineNumber,
          // $0.columnNumber,
        ];
        return template(...args);
      };
    }
    default:
      throw new SyntaxError("Unexpected node type: " + node.type);
  }
}

const delimiters = ["'", '"', "`", "/"] as const;

/**
 * Parse a string containing template expressions into an array of nodes.
 *
 * For example, in the string "Hello ${world}, my name is $1", the following
 * would be identified as expressions:
 * - "${world}"
 * - "$1"
 *
 * Most of the logic here is to handle nested expressions, objects and strings
 * so that we don't terminate the expression too early in templates like:
 * - "Foo ${'{bar}'}"
 *
 *
 */
export function parseTemplate(template: string) {
  let cumulative = "";
  let state: State = "text";
  let delimiter: (typeof delimiters)[number] | null = null;
  let expressionDepth = 0;

  const output: TemplateNode[] = [];

  function changeState(newState: State) {
    output.push({ type: state, value: cumulative });
    cumulative = "";
    state = newState;
  }

  // TODO: Tidy. Document why this was chosen over a regex / nearley / moo
  for (let i = 0; i < template.length; i++) {
    const prev = template[i - 1];
    const char = template[i];
    const next = template[i + 1];

    if (state === "text") {
      if (prev === "$" && char === "{" && template[i - 2] !== "\\") {
        // Expression like "${foo}"
        changeState("expression");
      } else if (prev === "$" && char && /\d/.test(char)) {
        // Expression like "$0"
        changeState("expression");
        cumulative += `$${char}`;
        changeState("text");
      } else {
        // Normal text. Ensure it's not an escape character, or dollar sign
        // used to start an expression.
        const isEscapeChar = char === "\\" && next === "$";
        const omit =
          isEscapeChar ||
          (template[i - 2] !== "\\" && char === "$" && next === "{") ||
          (char === "$" && next && /\d/.test(next));

        if (!omit) {
          cumulative += char;
        }
      }
    } else if (state === "expression") {
      if (delimiter !== null) {
        // We're inside a string / regex.
        if (char === delimiter && prev !== "\\") {
          // End of string / regex.
          delimiter = null;
          expressionDepth--;
        }

        cumulative += char;
      } else {
        if (char === "}" && expressionDepth === 0) {
          changeState("text");
        } else {
          // Characters like: ' " ` /
          if (delimiters.includes(char as any)) {
            // We're NOT inside a string / regex. Start one.
            delimiter = char as any;
            expressionDepth++;
          } else {
            if (char === "{" || char === "[") {
              expressionDepth++;
            } else if (char === "}" || char === "]") {
              expressionDepth--;
            }
          }

          cumulative += char;
        }
      }
    }
  }

  // Commit last characters
  changeState("text");

  return output.filter(({ value: text }) => text.length > 0);
}
