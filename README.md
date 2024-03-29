# Regex Robin

**Regex Robin** is a VS Code extension that allows you to customize the appearance of text in your editor using regex patterns, as well as creating links and hover messages.

## Configuration

You can configure rules like this:

```json
{
  "regexrobin.rules": [
    {
      "regex": "ISSUE-\\d+",
      "tree": { "group": "Jira links" },
      "editor": [
        {
          "link": "https://myorg.atlassian.net/browse/$0",
          "color": "#66D9EF",
          "hoverMessage": "Jira ticket **$0**"
        }
      ]
    }
  ]
}
```

Combined with similar rules to match markdown links, and "TODO" and "NOTE" comments, it leads to the following experience:

![Animated gif showing a code comment that has a link that can be clicked](assets/usage.gif)

The above example uses:

- The tree view to display the matches in the sidebar
- The "link" feature to create clickable links for issues
- Custom styling to highlight the matches
- The `inlineReplacement` feature to hide the URL of the markdown link

More examples are documented in the [example configuration](./test/extension-test-workspace.code-workspace), as well as the "templates" feature for reusing complex regex patterns.

### Rule precedence

#### Styles

Styles are applied in the order they are defined. Styles can overlap.

With the example config below, the text "hello world" would have a red "hello" and a blue "world".

```json
{
  "regexrobin.rules": [
    {
      "regex": "hello world",
      "editor": [{ "color": "red" }]
    },
    {
      "regex": "world",
      "editor": [{ "color": "blue" }]
    }
  ]
}
```

If we reverse the order of these rules, then the entire text would be red.

#### Links

When two link rules apply to the same text, the one defined last wins.

```jsonc
{
  "regexrobin.rules": [
    // Match links like repo-name#22 to the relevant pull request
    {
      "regex": "([a-z_-]+)#(\\d+)",
      "regexFlags": { "ignoreCase": true },
      "editor": [{ "link": "https://github.com/myorg/$1/pull/$2" }]
    },
    // Match links like special-case#22 to the relevant pull request,
    // which is in a different github organisation, and has a long,
    // inconvenient name.
    {
      "regex": "special-case#(\\d+)",
      "editor": [
        {
          "link": "https://github.com/someorg/really-long-inconvenient-name/pull/$1"
        }
      ]
    }
  ]
}
```

The second rule is the one that would take effect for the text "special-case#22", despite the fact that the regex for both rules match the text.

<!-- This relies on potentially undocumented behaviour.

This extension does not enforce this logic, but instead relies on the fact that VS Code
just works like this by default. -->

## Limitations

If you have "Word wrap" enabled, any extra lines created by long text being wrapped will still be visible when using the `inlineReplacement` feature to replace it with something shorter, even if the replacement fits on one line.

## Troubleshooting

### Extension fails to load with error "Invalid flags: dg"

This error has been observed when another installed extension polyfills the `String.prototype.matchAll` function with a non-standard implementation, breaking Regex Robin. This is a [known issue with the popular extension "Todo Tree"](https://github.com/dlevs/vscode-regex-robin/issues/6).

The solution is to disable the extension that is causing the issue. VSCode's ["Extension Bisect" feature](https://code.visualstudio.com/blogs/2021/02/16/extension-bisect) can help you find the offending extension.

### Absolute filepaths on Windows

Absolute filepaths need to be prepended with `file://`:

```diff
- "link": "${workspaceFolder}/path/to/my/file.md"
+ "link": "file:///${workspaceFolder}/path/to/my/file.md"
```

See [this issue](https://github.com/dlevs/vscode-regex-robin/issues/5#issuecomment-1880413812).

## The logo

The logo was generated using [DALL·E 2](https://openai.com/dall-e-2/).

## Contributing

Read the [contributing doc](CONTRIBUTING.md) for direction around setting up the extension for development and debugging.

If you're extending the extension's configuration options, look into the `build:config` script - it generates the JSON schema for the TypeScript definitions to avoid duplicate work.
