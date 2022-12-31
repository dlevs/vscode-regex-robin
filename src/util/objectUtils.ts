import isPlainObject from "lodash/isPlainObject";

/**
 * Replaces `description` with `markdownDescription` in the given object,
 * recursively.
 */
export function replaceDescriptionsWithMarkdown(value: unknown): unknown {
  if (value instanceof Array) {
    return value.map(replaceDescriptionsWithMarkdown);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(value as any).map(([key, value]) => {
        if (key === "description") {
          return ["markdownDescription", value];
        }

        return [key, replaceDescriptionsWithMarkdown(value)];
      })
    );
  }

  return value;
}
