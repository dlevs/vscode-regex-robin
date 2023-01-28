import * as vscode from "vscode";
import Tokenizr from "tokenizr";

// TODO: tidy
const lexer = new Tokenizr();

lexer.rule(/('|"|`)(.*?)\1/, (ctx, match) => {
  ctx.accept("string", match[2]);
});

lexer.rule(/(?:\+|-)?\d+(?:\d|_|\.)*/, (ctx, match) => {
  ctx.accept("number", Number(match));
});

lexer.rule(/\/(.+?)\/([a-z]*)/, (ctx, match) => {
  ctx.accept("regex", RegExp(match[1], match[2]));
});

lexer.rule(/_/, (ctx, match) => {
  ctx.accept("variable");
});

lexer.rule(/^[a-zA-Z]+/, (ctx, match) => {
  ctx.accept("methodName");
});

lexer.rule(/\(/, (ctx, match) => {
  ctx.accept("openBracket");
});

lexer.rule(/\)$/, (ctx, match) => {
  ctx.accept("closeBracket");
});

lexer.rule(/,/, (ctx, match) => {
  ctx.accept("argumentSeparator");
});

lexer.rule(/\s*/, (ctx, match) => {
  ctx.accept("whitespace");
});

// lexer.rule(/.*/, (ctx, match) => {
//   ctx.accept("arguments");
// });

function parseTransform(input: string) {
  const tokens = lexer.input(input).tokens();

  return {
    methodName: tokens[0]!.value,
    args: tokens.flatMap((token) => {
      if (
        token.type === "string" ||
        token.type === "number" ||
        token.type === "regex" ||
        token.type === "variable"
      ) {
        return token.value;
      }

      return [];
    }),
  };
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
      const [variableName, ...transforms] = expression.split(":");

      if (!variableName) {
        return "";
      }

      const isNumber = /^\d+$/.test(variableName);

      let output: string | number = isNumber
        ? matchGroups[Number(variableName)]?.match ?? ""
        : "";

      for (const transform of transforms) {
        // TODO: Error handle
        const { methodName, args } = parseTransform(transform);

        if (methodName in String.prototype) {
          output = String(output)[methodName as any](...args);
        } else if (methodName in Number.prototype) {
          output = Number(output)[methodName as any](...args);
        } else if (methodName in Math) {
          // TODO: Add tests for this
          const mathArguments =
            args.length === 0
              ? [Number(output)]
              : args.map((arg) => (arg === "_" ? Number(output) : Number(arg)));
          output = Math[methodName](...mathArguments);
        } else {
          vscode.window.showErrorMessage(
            `Unknown transform "${transform}" ignored`
          );
        }
      }

      return String(output);
    })
    .replace(/\\\$/g, "$");
}
