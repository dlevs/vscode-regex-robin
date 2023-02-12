@{%
const moo = require('moo')

// TODO: Escape char
const lexer = moo.states({
  main: {
    '${': { match: /(?<!\\)\$\{/, push: 'template' },
    matchIndex: { match: /(?<!\\)\$\d+/, value: x => x.replace('$', '') },
    // Match everything except $, unless it's escaped.
    text: { match: /(?:[^$]|(?<=\\)\$)+/, lineBreaks: true, value: x => x.replaceAll('\\$', '$') },
  },
  template: {
    // States. Go one level deeper for every object / array started, so
    // we can pop back to the `main` state at the correct point.
    '{': { match: '{', push: 'template' },
    '[': { match: '[', push: 'template' },
    '}': { match: '}', pop: 1 },
    ']': { match: ']', pop: 1 },
    // Characters
    '(': '(',
    ')': ')',
    ':': ':',
    ',': ',',
    // Variable names, and literals
    identifier: /[a-zA-Z$_][a-zA-Z0-9$_]*/,
    number: /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
    string: new RegExp(`(?:${
      ['"', "'", '`']
        .map(char => `${char}.*?(?<!\\\\)${char}`)
        .join('|')
    })`),
    regex: /\/.+?(?<!\\)\/[a-z]*/,
    // Basic literals
    true: 'true',
    false: 'false',
    null: 'null',
    // Whitespace
    space: { match: /\s+/, lineBreaks: true },
  },
})
%}

@lexer lexer

# TODO: Comment
main -> (template | matchIndex | text):+ {% (d) => d[0].map(x => x[0]) %}

text -> %text {% (d) => ({ type: 'text', value: d[0].value }) %}

template -> "${" subject (":" transform):* "}" {% parseTemplate %}

matchIndex -> %matchIndex {% parseMatchIndex %}

subject -> %number {% (d) => d[0].value %}

transform -> %identifier "(" arguments ")" {% parseTransform %}

arguments -> null {% () => [] %}
  | _ value _ {% (d) => [d[1]] %}
  | _ value (_ "," _ value):* _ {% extractArguments %}

value ->
      object {% id %}
    | array {% id %}
    | number {% id %}
    | string {% id %}
    | regex {% id %}
    | %identifier {% id %}
    | "true" {% () => true %}
    | "false" {% () => false %}
    | "null" {% () => null %}

object -> "{" _ "}" {% () => ({}) %}
    | "{" _ pair (_ "," _ pair):* _ "}" {% extractObject %}

array -> "[" _ "]" {% () => [] %}
    | "[" _ value (_ "," _ value):* _ "]" {% extractArray %}

number -> %number {% (d) => Number(d[0].value) %}

string -> %string {% d => d[0].value.slice(1, -1) %}

regex -> %regex {% parseRegex %}

pair -> key _ ":" _ value {% (d) => [d[0], d[4]] %}

key -> %identifier {% id %}

_ -> null | %space {% (d) => null %}

@{%
function parseTemplate(d) {
  return {
    type: 'template',
    value: d[1],
    transforms: d[2].map(x => x[1])
  }
}

function parseMatchIndex(d) {
  return {
    type: 'template',
    value: d[0],
    transforms: []
  }
}

function parseTransform(d) {
   const methodName = d[0].value
   return { methodName, args: d[2] }
}

function parseRegex(d) {
  const [, pattern, flags] = d[0].value.split(/(?<!\\)\//)
  return new RegExp(pattern, flags)
}

function extractPair(kv, output) {
    if(kv[0]) { output[kv[0]] = kv[1]; }
}

function extractObject(d) {
    let output = {};

    extractPair(d[2], output);

    for (let i in d[3]) {
        extractPair(d[3][i][3], output);
    }

    return output;
}

function extractArray(d) {
    let output = [d[2]];

    for (let i in d[3]) {
        output.push(d[3][i][3]);
    }

    return output;
}

function extractArguments(d) {
    return [
      d[1],
      ...d[2].map(x => x[3])
    ];
}
%}
