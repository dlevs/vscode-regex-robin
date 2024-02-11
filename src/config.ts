import * as vscode from "vscode";
import orderBy from "lodash/orderBy";
import { decorationTypes } from "./util/documentUtils";
import { compileTemplate } from "./compileTemplate";
import type {
  Config,
  ConfigInput,
  EditorEffect,
  InlineReplacement,
  RegexInput,
  RegexTemplate,
  Rule,
  EditorEffectInput,
  RuleInput,
  InlineReplacementInput,
} from "./types/config";

export const EXTENSION_NAME = "regexrobin";

export function getConfig(): Config {
  const {
    rules = [],
    templates = {},
    tree,
  }: ConfigInput = vscode.workspace.getConfiguration().get(EXTENSION_NAME) ??
  {};

  // The first-applied style "wins" when two styles apply to the same range.
  // As a human, the intuitive behavior is that rules that apply later in
  // the list overwrite the ones that came before, so we reverse the list.
  const reversedRules = [...rules].reverse();

  const rulesOutput = reversedRules.flatMap((rule): Rule[] => {
    const { regex, regexFlags, languages = ["*"], editor = [] } = rule;

    if (!regex) {
      return filterOutWithError('Rule defined with no "regex" pattern.');
    }

    const group =
      rule.tree?.group != null
        ? rule.tree.group instanceof Array
          ? rule.tree.group
          : [rule.tree.group]
        : [];

    const shared = {
      tree: rule.tree && {
        group: group.map(compileTemplate),
        label: compileTemplate(rule.tree.label ?? "$0"),
      },
      languages,
      editor: processEditorEffects(editor),
    } satisfies Partial<Rule>;

    return processRegex(regex, regexFlags, templates).map(
      ({ regex, flags }) => {
        return {
          /**
           * Get the regex for this rule.
           *
           * This is a function, since regexes are stateful and remember
           * the last match from `.exec()`.
           */
          getRegex() {
            return new RegExp(regex, flags);
          },
          ...shared,
        };
      }
    );
  });

  const ruleDecorations = new Set<vscode.TextEditorDecorationType>();
  for (const rule of rulesOutput) {
    for (const effect of rule.editor) {
      ruleDecorations.add(effect.decoration);
    }
  }

  return {
    rules: rulesOutput,
    ruleDecorations: Array.from(ruleDecorations),
    tree: {
      ...DEFAULT_TREE_CONFIG,
      ...tree,
    },
    dispose: () => {
      for (const decoration of ruleDecorations) {
        decoration.dispose();
      }
    },
  };
}

// TODO: Test
function processRegex(
  regex: RuleInput["regex"],
  regexFlags: RuleInput["regexFlags"],
  templates: Record<string, RegexTemplate>
): {
  regex: string;
  flags: string;
}[] {
  if (typeof regex !== "string" && "template" in regex) {
    const template = templates[regex.template];

    if (!template) {
      return filterOutWithError(
        `Regex template "${regex.template}" is not defined.`
      );
    }

    let regexPatterns = compileArrayRegex(template.regex);

    for (const [key, value] of Object.entries(regex.replace)) {
      regexPatterns = regexPatterns.map((pattern) => {
        return pattern.replace(new RegExp(key, "g"), value);
      });
    }
    const flags = processRegexFlags(regexFlags ?? template.regexFlags);

    return regexPatterns.map((pattern) => {
      return { regex: pattern, flags };
    });
  } else {
    const regexPatterns = compileArrayRegex(regex);
    const flags = processRegexFlags(regexFlags);

    return regexPatterns.map((pattern) => {
      return { regex: pattern, flags };
    });
  }
}

// TODO: Test
function compileArrayRegex(regex: RegexInput): string[] {
  if (typeof regex === "string") {
    return [regex];
  }

  const lengths = new Set<number>();
  for (const part of regex) {
    if (part instanceof Array) {
      lengths.add(part.length);
    }
  }

  if (lengths.size > 1) {
    return filterOutWithError("Regex array has inconsistent lengths.");
  }

  const length = Array.from(lengths.values())[0] ?? 1;
  return Array.from({ length }).map((_, i) => {
    return regex
      .map((part) => {
        if (part instanceof Array) {
          return part[i];
        } else {
          return part;
        }
      })
      .join("");
  });
}

export function processRegexFlags(flags: RuleInput["regexFlags"] = {}) {
  let output = "";

  if (typeof flags === "string") {
    output = flags;
  } else {
    if (flags.ignoreCase) output += "i";
    if (flags.multiline) output += "m";
    if (flags.dotAll) output += "s";
    if (flags.unicode) output += "u";
  }

  // The "d" flag is needed to track the indices of matched capture groups
  // for styling them separately.
  if (!output.includes("d")) output += "d";

  // The "g" flag is needed to call `String.prototype.matchAll()`.
  if (!output.includes("g")) output += "g";

  return output;
}

function processEditorEffects(effects: EditorEffectInput[]) {
  const decoratedEffects = effects.map((effect) => {
    const {
      group = 0,
      link,
      hoverMessage,
      inlineReplacement: inlineReplacementInput,
      ...style
    } = effect;

    const inlineReplacementObj: InlineReplacementInput | undefined =
      inlineReplacementInput == null
        ? undefined
        : typeof inlineReplacementInput === "string"
        ? { contentText: inlineReplacementInput }
        : { contentText: "", ...inlineReplacementInput };

    let inlineReplacement: InlineReplacement | undefined;

    if (typeof inlineReplacementObj?.contentText === "string") {
      // Replace empty strings with a zero-width space so that the text
      // gets hidden if user configures it. `""` by itself does not hide
      // the original text.
      if (inlineReplacementObj.contentText === "") {
        inlineReplacementObj.contentText = "\u200B";
      }

      inlineReplacement = {
        ...inlineReplacementObj,
        contentText: compileTemplate(inlineReplacementObj.contentText),
      };
    }

    return {
      style,
      link,
      hoverMessage,
      inlineReplacement,
      group,
    };
  });

  // Sort the effects so that they are in descending order of capture group.
  // This is important. The order in which the decorations are _generated_
  // (not applied) matters, and the first-defined one takes precedence where
  // ranges overlap, as they do when styling capture group $0 yellow, and $1 (subset)
  // blue.
  const sortedEffects = orderBy(
    decoratedEffects,
    (effect) => effect.group,
    "desc"
  );

  return sortedEffects.flatMap(
    ({ style, ...effect }): EditorEffect | never[] => {
      return {
        ...effect,
        link: compileTemplate(effect.link),
        hoverMessage: compileTemplate(effect.hoverMessage),
        // ❗️ Warning! Do not refactor! ❗️
        // Decorations must be created in the correct order for the correct precedence
        // to apply. See the comment for `sortedEffects`, above.
        decoration: style
          ? vscode.window.createTextEditorDecorationType(style)
          : decorationTypes.none,
      };
    }
  );
}

function filterOutWithError(message: string): never[] {
  vscode.window.showErrorMessage(message);
  return [];
}

export const DEFAULT_TREE_CONFIG = {
  expanded: false,
  sort: true,
  includeFilenames: false,
};
