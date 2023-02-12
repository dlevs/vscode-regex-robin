import { Lexer, ParserRule } from "nearley";

declare const grammar: {
  Lexer?: Lexer;
  ParserStart: string;
  ParserRules: ParserRule[];
};

export default grammar;

export type TemplateNode =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "template";
      value: string;
      transforms: { methodName: string; args: unknown[] }[];
    };
