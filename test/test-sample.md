## Normal markdown text

TODO: This text should be highlighted.
As should this. It will also appear in the tree view under `Explore > Regex Robin`.

This should not be highlighted.

{{FOO}}

[My link, where the URL is hidden](https://google.com)

TIP: This text will be shortened to 14 characters, max.

((Shortened text with an icon in the gutter))

https://github.com/dlevs/duration-fns/pull/20

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

## HTML

```html
<main class="main my-other-class lots-of-classes">
  <header>
    <h1 class="heading heading-main super-heading mb-20">My Heading</h1>
  </header>
  <section>
    <p class="fancy-paragraph mb-10">My paragraph text</p>
  </section>
</main>
```
