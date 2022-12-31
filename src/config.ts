import * as vscode from "vscode";
import orderBy from "lodash/orderBy";
import { decorationTypes } from "./util/documentUtils";

/**
 * The config schema, as VSCode expects it to be defined in package.json.
 *
 * A script automatically generates the schema and inserts it into package.json,
 * so we get all of the types and JSDoc documentation for free.
 */
export type VSCodeConfigForSchemaGeneration = {
  [P in keyof ConfigInput as `regexrobin.${P}`]?: ConfigInput[P];
};

/**
 * Config, as defined by the user in their settings.
 */
interface ConfigInput {
  /**
   * An array of regex patterns, and the rules to apply to them.
   */
  rules?: RuleInput[];

  templates?: Record<string, RegexTemplate>;
}

/**
 * A regex pattern to search for.
 *
 * This may also be defined as an array of strings which are ultimately
 * concatenated together. This is useful for breaking up long patterns
 * and adding comments to improve readability.
 *
 * Nested arrays may be defined to create multiple rules from a single
 * rule definition.
 *
 * @example
 * [
 *   'hello',
 *   ['world', 'bob'],
 *   'have a good',
 *   ['day', 'sandwich']
 * ]
 *
 * // This is equivalent to two rules, with the regex patterns:
 * // - /hello world have a good day/
 * // - /hello bob have a good sandwich/
 */
type RegexInput = string | (string | string[])[];

interface RegexTemplate {
  regex: RegexInput;
  regexFlags?: string | RegexFlagsInput;
}

interface RegexTemplateUse {
  template: string;
  replace: Record<string, string>;
}

export interface RuleInput {
  /**
   * A regex pattern to search for.
   *
   * This may also be defined as an array of strings which are ultimately
   * concatenated together. This is useful for breaking up long patterns
   * and adding comments to improve readability.
   *
   * Nested arrays may be defined to create multiple rules from a single
   * rule definition.
   *
   * @example
   * [
   *   'hello',
   *   ['world', 'bob'],
   *   'have a good',
   *   ['day', 'sandwich']
   * ]
   *
   * // This is equivalent to two rules, with the regex patterns:
   * // - /hello world have a good day/
   * // - /hello bob have a good sandwich/
   */
  regex: RegexInput | RegexTemplateUse;
  /**
   * Flags to apply to the regex pattern.
   */
  regexFlags?: string | RegexFlagsInput;
  /**
   * Languages to apply this rule to.
   *
   * If not specified, the rule will be applied to all languages.
   *
   * There is a special "terminal" language that can be used to provide links for
   * texts in the editor terminal.
   *
   * @default ["*"]
   */
  languages?: string[];
  /**
   * Effects to apply to the matched text in the text editor / terminal.
   *
   * ## Capture groups
   *
   * The `group` property defines which portion of the matched text
   * to apply the effect to. If omitted, it defaults to the entire match.
   *
   * For example, `group: 2` applies to "world" in a match for the
   * regex pattern `/(hello) (world)/`, the same way you'd use "$2" in
   * JavaScripts `String.prototype.replace(RegExp, String)` method.
   *
   * With this, you can style different parts of the matched text independently.
   *
   * ## Terminal links
   *
   * Effects in the terminal are limited to links (no styling).
   *
   * @default []
   */
  editor?: RuleEffectInput[];
  /**
   * Options for the tree view.
   */
  tree?: Partial<TreeParams>;
}

/**
 * Flags to apply to a regex pattern.
 *
 * Documentation taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
 */
interface RegexFlagsInput {
  /**
   * When matching, casing differences are ignored.
   *
   * @default false
   */
  ignoreCase?: boolean;
  /**
   * Treat beginning and end assertions (`^` and `$`) as working over multiple
   * lines. In other words, match the beginning or end of each line (delimited
   * by `\n` or `\r`), not only the very beginning or end of the whole input string.
   *
   * @default false
   */
  multiline?: boolean;
  /**
   * Allows `.` to match newlines.
   *
   * @default false
   */
  dotAll?: boolean;
  /**
   * Treat the string being matched as a sequence of Unicode code points.
   *
   * @default false
   */
  unicode?: boolean;
}

interface TreeParams {
  /**
   * A label to group matches under in the tree view.
   *
   * @default "Ungrouped"
   */
  group: string;
  /**
   * The text to display for each match in the tree view.
   *
   * Capture group substitution is supported, e.g. "$1".
   *
   * @default "$0"
   */
  label: string;
}

interface RuleEffectInput extends vscode.DecorationRenderOptions {
  /**
   * The portion of the matched text to apply the effect to.
   *
   * @default 0
   */
  group?: number;
  /**
   * A link to open when the relevant match is clicked.
   *
   * Capture group substitution is supported, e.g. "$1".
   */
  link?: string;
  /**
   * Text to display when hovering over the relevant match.
   *
   * Capture group substitution is supported, e.g. "$1".
   */
  hoverMessage?: string;
  /**
   * Text to display in the editor instead of the matched text, so long
   * as the cursor (or current selection) is not on the line of the match.
   *
   * Capture group substitution is supported, e.g. "$1".
   *
   * The substitution is defined in the "contextText" property.
   */
  inlineReplacement?: string | InlineReplacement;
}

/**
 * Config that has been transformed into a usable format, with defaults applied,
 * regex patterns compiled, rules sorted, etc.
 *
 * It implements `vscode.Disposable` because it generates `ruleDecorations`,
 * which can be cleaned up when the extension is deactivated, or config changes.
 */
interface Config {
  rules: Rule[];
  ruleDecorations: vscode.TextEditorDecorationType[];
  dispose: () => void;
}

export interface Rule {
  getRegex(): RegExp;
  languages: string[];
  editor: EditorEffect[];
  tree?: TreeParams;
}

interface EditorEffect extends RuleEffectInput {
  /**
   * Capture group to apply this effect to.
   *
   * Default has been applied, so it's no longer an optional property.
   */
  group: number;
  /**
   * Inline replacement text.
   *
   * String values have been normalized to object.
   */
  inlineReplacement?: InlineReplacement;
  /**
   * Generated on init - not from config.
   */
  decoration: vscode.TextEditorDecorationType;
}

type InlineReplacement = vscode.ThemableDecorationAttachmentRenderOptions;

export const EXTENSION_NAME = "regexrobin";

export function getConfig(): Config {
  const { rules = [], templates = {} }: ConfigInput =
    vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};

  // The first-applied style "wins" when two styles apply to the same range.
  // As a human, the intuitive behavior is that rules that apply later in
  // the list overwrite the ones that came before, so we reverse the list.
  const reversedRules = [...rules].reverse();

  const rulesOutput = reversedRules.flatMap((rule): Rule[] => {
    const { regex, regexFlags, languages = ["*"], editor = [] } = rule;

    if (!editor.length) {
      return filterOutWithError('Rule defined with no "effects".');
    }

    if (!regex) {
      return filterOutWithError('Rule defined with no "regex" pattern.');
    }

    const shared = {
      tree: rule.tree && {
        group: rule.tree.group ?? "Ungrouped",
        label: rule.tree.label ?? "$0",
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

function processEditorEffects(effects: RuleEffectInput[]) {
  const decoratedEffects = effects.map((effect) => {
    const {
      group = 0,
      link,
      hoverMessage,
      inlineReplacement: inlineReplacementInput,
      ...style
    } = effect;

    const inlineReplacement: InlineReplacement | undefined =
      inlineReplacementInput == null
        ? undefined
        : typeof inlineReplacementInput === "string"
        ? { contentText: inlineReplacementInput }
        : { ...inlineReplacementInput };

    // Replace empty strings with a zero-width space so that the text
    // gets hidden if user configures it. `""` by itself does not hide
    // the original text.
    if (inlineReplacement?.contentText === "") {
      inlineReplacement.contentText = "\u200B";
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
