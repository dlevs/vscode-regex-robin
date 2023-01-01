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

This should not be highlighted. But @Clara should be highlighted and appear in the tree view.

## Bullet lists

- Here, TODO: This text should be highlighted.
  1. But this should not
  2. Though this should after TODO: this,
     and here still
  3. But not this line
- This text should not be highlighted. TODO: But this should
- NOTE: This text should be highlighted.
  As should this.
- This text should not be highlighted. TODO: But this should
  and so should this

  but not this.

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
//And this badly indented line.
//
// But not this.

// TODO: This todo...
// TODO: ...and this todo, should be in the tree separately
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
