type State = "text" | "expression";

export interface TemplateNode {
  type: State;
  value: string;
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
 */
export function parseTemplate(template: string): TemplateNode[] {
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
