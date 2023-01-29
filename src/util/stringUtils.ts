// import * as vscode from "vscode";
import Tokenizr, { ActionContext } from "tokenizr";

// TODO: tidy

// type Token =
//   | {
//       type: "subject";
//       value:
//         | { type: "envVariable"; key: string }
//         | { type: "variable"; key: string }
//         | { type: "matchIndex"; key: number };
//     }
//   | { type: "methodName"; value: string }
//   | { type: "argument"; value: unknown }
//   | { type: "argumentPlaceholder" }
//   | { type: "expressionSeparator" }
//   | { type: "EOF" };

function acceptToken(ctx: ActionContext, token: Token) {
  ctx.accept(token.type, "value" in token ? token.value : undefined);
}

const ARGUMENT_PLACEHOLDER = Symbol("placeholder");

const lexer = createExpressionsLexer();

export function compileExpression(input: string) {
  let getSubject: null | ((matches: string[]) => string) = null;
  const transforms: {
    method(...args: unknown[]): string | number;
    args: unknown[];
  }[] = [];

  try {
    // TODO: Compile these things once. Not every match
    const tokens = lexer.input(input).tokens() as Token[];

    for (const token of tokens) {
      switch (token.type) {
        case "subject": {
          const { type, key } = token.value;
          switch (type) {
            case "matchIndex":
              getSubject = (matches: string[]) => matches[key] ?? "";
              break;
            case "envVariable":
              getSubject = () => process.env[key] ?? "";
              break;
            case "variable":
              // TODO
              break;
          }
          break;
        }

        case "methodName": {
          const method = getMethodFromName(token.value);
          if (!method) {
            const errorMessage = `Unknown transform "${token.value}" ignored`;
            // TODO: Put back. Or handle errors better higher up
            // vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
          }
          transforms.push({ method, args: [] });
          break;
        }

        case "argument":
        case "argumentPlaceholder": {
          const lastTransform = transforms[transforms.length - 1];
          if (!lastTransform) {
            throw new Error("Found arguments with no method to pass them to");
          }
          lastTransform.args.push(
            token.type === "argumentPlaceholder"
              ? ARGUMENT_PLACEHOLDER
              : token.value
          );
          break;
        }
      }
    }
    if (getSubject == null) {
      throw new Error("No subject provided");
    }
  } catch (err) {
    console.error(err);
    throw new SyntaxError(`Failed to parse expressions. ${err.message}`);
  }

  return function processMatches(matches: string[]) {
    let output: string | number = getSubject!(matches);

    for (const transform of transforms) {
      output = transform.method.apply(output, transform.args);
    }

    return String(output);
  };
}

function getMethodFromName(methodName: string): void | (() => string | number) {
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
}

/**
 * Populate string with variables from regex capture groups.
 *
 * @example
 * ```ts
 * const match = /Hello (\w+)/.exec("Hello Clara");
 * replaceMatches("Your name is $1", match); // => "Your name is Clara"
 * ```
 *
 * Dollar signs can be escaped with a backslash, so `"\$1"` is not replaced.
 */
export function replaceMatches(
  template: string,
  matchGroups: ({ match: string } | null)[]
) {
  return template
    .replace(/(?<!\\)\$(?:(\d+)|\{(.+?)\})/g, (_match, group1, group2) => {
      const expression =
        typeof group1 === "string"
          ? group1 // E.g. $1
          : typeof group2 === "string"
          ? group2 // E.g. ${1}
          : "";

      // TODO: Move this. The expressions should be compiled once, not for every match. It's here for now just for testing.
      return compileExpression(expression)(
        matchGroups.map((group) => group?.match ?? "")
      );
    })
    .replace(/\\\$/g, "$");
}
