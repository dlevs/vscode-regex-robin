import * as vscode from "vscode";
import type { PartialDeep } from "type-fest";

interface Config {
  rules: Rule[];
}

export interface Rule {
  linkPattern: string;
  linkPatternFlags: string;
  languages: string[];
  effects: {
    captureGroup?: number;
    linkTarget?: string;
    color?: string;
    replaceWith?: string;
    hoverMessage?: string;
  }[];
}

export const EXTENSION_NAME = "patternlinks";

export function getConfig(): Config {
  const config: PartialDeep<Config> =
    vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};

  return {
    rules: (config.rules ?? []).flatMap((rule) => {
      let {
        linkPattern,
        linkTarget,
        linkPatternFlags = "",
        languages = [],
      } = rule ?? {};

      // If required values are missing, filter this entire
      // rule out.
      if (!linkPattern || !linkTarget) {
        return [];
      }

      // No language defined means all languages.
      if (!languages.length) {
        languages = ["*"];
      }

      return {
        linkPattern,
        linkTarget,
        linkPatternFlags,
        // Remove null / undefined
        languages: languages.flatMap((language) => {
          return !language ? [] : language;
        }),
      };
    }),
  };
}
