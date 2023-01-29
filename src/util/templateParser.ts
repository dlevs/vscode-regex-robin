import Tokenizr, { ActionContext } from "tokenizr";

type TypedActionContext = Omit<ActionContext, "accept" | "push"> & {
  accept<T extends Token["type"]>(
    token: T,
    value: Extract<Token, { type: T }>["value"]
  ): void;
  push(state: State): void;
};
type TypedRuleAction = (
  ctx: TypedActionContext,
  match: RegExpExecArray
) => void;
type TypedTokenizr = Omit<Tokenizr, "rule"> & {
  rule(
    state: State | string,
    pattern: RegExp,
    action: TypedRuleAction,
    name?: string
  ): TypedTokenizr;
};

type State = "default" | "template" | "object" | "array" | "functionCall";

const tokenizr = createTemplateLexer().input('My text ${3:replace(/f/, "")}');
// console.log(
//   createTemplateLexer().input('My text ${3:replace("{}", "")}').tokens()
// );
// console.log(
//   createTemplateLexer().input('"My text ${3:toUpperCase()}"').tokens()
// );

let token = tokenizr.token();
while (token) {
  console.log(token);
  token = tokenizr.token();
}

type Token =
  // Contexts
  | { type: "template:start"; value: TemplateSubject }
  | { type: "template:end"; value: string }
  | { type: "object:start"; value: string }
  | { type: "object:end"; value: string }
  | { type: "array:start"; value: string }
  | { type: "array:end"; value: string }
  | { type: "functionCall:start"; value: string }
  | { type: "functionCall:end"; value: string }
  // Values
  | { type: "literal"; value: unknown }
  | { type: "variable"; value: string }
  // Meta
  | { type: "text"; value: string }
  | { type: "templateExpressionDelimiter"; value: string }
  | { type: "argumentDelimiter"; value: string }
  | { type: "EOF"; value: string };

type TemplateSubject =
  | { type: "envVariable"; key: string }
  | { type: "variable"; key: string }
  | { type: "matchIndex"; key: number };

export function createTemplateLexer() {
  const lexer = new Tokenizr() as TypedTokenizr;

  return (
    lexer
      // Simple case - Replacing "$1" in text.
      .rule("default", /(?<!\\)\$(\d+)/, (ctx, match) => {
        ctx.accept("template:start", {
          type: "matchIndex",
          key: Number(match[1]),
        });
        ctx.accept("template:end", "");
      })
      // Advanced case - Replacing "${1:trim():toUpperCase()}" in text.
      // This rule matches the "${1" portion, achieving the same as the
      // "Simple case" above, but also pushing "template" onto the state
      // stack to keep parsing for extra tokens that might modify the
      // value.
      .rule("default", /(?<!\\)\$\{((?:env:)?[^:}]*)/, (ctx, match) => {
        const rawValue = match[1] ?? "";
        const value: TemplateSubject = rawValue.startsWith("env:")
          ? {
              type: "envVariable",
              key: rawValue.replace("env:", ""),
            }
          : /^\d+$/.test(rawValue)
          ? {
              type: "matchIndex",
              key: Number(rawValue),
            }
          : {
              type: "variable",
              key: rawValue,
            };
        ctx.accept("template:start", value);
        ctx.push("template");
      })

      // ----------------------------------
      // Function calls, like:
      // foo(10, myOtherArg)
      // ----------------------------------
      .rule("template", /([a-z_$]+)\(/i, (ctx, match) => {
        ctx.accept("functionCall:start", match[1]!);
        ctx.push("functionCall");
      })
      // Variable names, and `null` / `undefined`
      .rule("functionCall", /[a-z$_][a-z0-9$_]*/i, (ctx, match) => {
        if (match[0] === "null") {
          ctx.accept("literal", null);
        } else if (match[0] === "undefined") {
          ctx.accept("literal", undefined);
        } else {
          ctx.accept("variable", match[0]);
        }
      })
      // Regex
      .rule("functionCall", /\/(.+?)(?<!\\)\/([a-z]*)/, (ctx, match) => {
        ctx.accept("literal", RegExp(match[1]!, match[2]));
      })
      // Strings
      .rule("functionCall", /('|"|`)(.*?)(?<!\\)\1/, (ctx, match) => {
        const value = match[2]!.replace(
          new RegExp(`\\\\${match[1]}`, "g"),
          match[1]!
        );
        ctx.accept("literal", value);
      })
      // Numbers
      .rule("functionCall", /(?:\+|-)?\d+(?:\d|_|\.)*/, (ctx, match) => {
        ctx.accept("literal", Number(match[0]));
      })
      .rule("functionCall", /\{/, (ctx, match) => {
        ctx.accept("object:start", match[0]);
        ctx.push("object");
      })
      .rule("functionCall", /\[/, (ctx, match) => {
        ctx.accept("array:start", match[0]);
        ctx.push("array");
      })

      // ----------------------------------
      // Meta
      // Like delimiters, and whitespace
      // ----------------------------------
      .rule("default", /./, (ctx, match) => {
        ctx.accept("text", match[0]);
      })
      .rule("template", /:/, (ctx, match) => {
        ctx.accept("templateExpressionDelimiter", match[0]);
      })
      // Whitespace
      .rule("template, functionCall, object, array", /\s+/, (ctx) => {
        ctx.ignore();
      })
      .rule("functionCall", /,/, (ctx, match) => {
        ctx.accept("argumentDelimiter", match[0]);
      })

      // ----------------------------------
      // Context ends
      // Like, }, ] and )
      // ----------------------------------
      .rule("template", /\}/, (ctx, match) => {
        ctx.accept("template:end", match[0]);
        ctx.pop();
        ctx.untag("whitespaceInsensitive");
      })
      .rule("functionCall", /\)/, (ctx, match) => {
        ctx.accept("functionCall:end", match[0]);
        ctx.pop();
      })
      .rule("object", /\}/, (ctx, match) => {
        ctx.accept("object:end", match[0]);
        ctx.pop();
      })
      .rule("array", /\]/, (ctx, match) => {
        ctx.accept("array:end", match[0]);
        ctx.pop();
      })
  );
}
