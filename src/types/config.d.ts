import type * as vscode from "vscode";
import type { DocumentMatch } from "../util/documentUtils";

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
 * Config that has been transformed into a usable format, with defaults applied,
 * regex patterns compiled, rules sorted, etc.
 *
 * It implements `vscode.Disposable` because it generates `ruleDecorations`,
 * which can be cleaned up when the extension is deactivated, or config changes.
 */
export interface Config {
  rules: Rule[];
  ruleDecorations: vscode.TextEditorDecorationType[];
  tree: Required<TreeSharedSettingsInput>;
  dispose: () => void;
}

export interface Rule {
  getRegex(): RegExp;
  languages: string[];
  editor: EditorEffect[];
  tree?: TreeParams;
}

export interface EditorEffect extends EditorEffectInput {
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
  /**
   * A link to open when the relevant match is clicked.
   *
   * This has been compiled into a `CompiledTemplate`.
   */
  link?: CompiledTemplate;
  /**
   * Text to display when hovering over the relevant match.
   *
   * This has been compiled into a `CompiledTemplate`.
   */
  hoverMessage?: CompiledTemplate;
}

interface TreeParams extends TreeParamsInput {
  group: CompiledTemplate[];
  label: CompiledTemplate;
}

export type InlineReplacement = Omit<InlineReplacementInput, "contentText"> & {
  contentText: CompiledTemplate;
};

export type CompiledTemplate = (match: DocumentMatch) => string;

/**
 * Config, as defined by the user in their settings.
 */
export interface ConfigInput {
  /**
   * An array of regex patterns, and the rules to apply to them.
   */
  rules?: RuleInput[];
  /**
   * A map of reusable regex patterns.
   */
  templates?: Record<string, RegexTemplate>;
  /**
   * Settings for tree views.
   */
  tree?: TreeSharedSettingsInput;
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
export type RegexInput = string | (string | string[])[];

/**
 * A reusable regex pattern.
 */
export interface RegexTemplate {
  regex: RegexInput;
  regexFlags?: string | RegexFlagsInput;
}

export interface RegexTemplateUse {
  /**
   * The key of the template to use, as defined in `regexrobin.templates`.
   */
  template: string;
  /**
   * Key / value pairs to replace in the template.
   *
   * Capture group substitution is supported for the values, e.g. "$1".
   */
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
  editor?: EditorEffectInput[];
  /**
   * Options for the tree view.
   */
  tree?: TreeParamsInput;
}

/**
 * Flags to apply to a regex pattern.
 *
 * Documentation taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
 */
export interface RegexFlagsInput {
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

interface TreeSharedSettingsInput {
  /**
   * Control whether the tree view is initially expanded.
   *
   * @default false
   */
  expanded?: boolean;
  /**
   * Control whether the tree view is sorted alphabetically.
   *
   * @default true
   */
  sort?: boolean;
  /**
   * Control whether the filename will be printed at the end of the respective items.
   *
   * @default false
   */
  includeFilenames?: boolean;
}

export interface TreeParamsInput {
  /**
   * A label to group matches under in the tree view.
   * An array of labels may be passed to enable nested entries.
   *
   * Capture group substitution is supported, e.g. "💁🏻‍♂️ $3".
   */
  group?: string | string[];
  /**
   * The text to display for each match in the tree view.
   *
   * Capture group substitution is supported, e.g. "$1".
   *
   * @default "$0"
   */
  label?: string;
}

export interface EditorEffectInput extends vscode.DecorationRenderOptions {
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
  inlineReplacement?: string | InlineReplacementInput;
}

type InlineReplacementInput = vscode.ThemableDecorationAttachmentRenderOptions;
