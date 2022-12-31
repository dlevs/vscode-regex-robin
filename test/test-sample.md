## Normal markdown text

TODO: This text should be highlighted.
As should this.

This should not be highlighted.

{{Foo}}

[My link, where the URL is hidden](https://google.com)

TIP: This text will be shortened to 14 characters, max.

## Nesting

TODO: This text should be highlighted.
As should this. But {{THIS_SHOULD_BE_BLUE}}, and [links](https://google.com) should be blue too.
The TIP: Is yellow and truncated.

This should not be highlighted.

## Bullet lists

- TODO: This text should be highlighted.
- This text should not be highlighted.
- NOTE: This text should be highlighted.
  As should this.
- This text should not be highlighted.

## Code comments

```typescript
/**
 * TODO: This text should be highlighted.
 * As should this.
 *
 * This should not be highlighted.
 *
 * Also, TODO: can be in the middle of a line.
 *
 * Even, TODO: can be in the middle of a line,
 * and continue on the next line.
 */
function imNotHighlighted() {}

// TODO: This text should be highlighted.
function imNotHighlighted() {}

// TODO: This text should be highlighted.
// As should this.
//
// But not this.
```
