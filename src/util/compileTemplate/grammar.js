// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require('moo')

const lexer = moo.states({
  main: {
    '${': { match: /(?<!\\)\$\{/, push: 'template' },
    matchIndex: /(?<!\\)\$\d+/,
    text: { match: /[^{]+/, lineBreaks: true, value: x => x.replace(/\\$/, '$') },
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
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["template"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["matchIndex"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["text"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1$subexpression$1"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["template"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["matchIndex"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["text"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["main$ebnf$1"], "postprocess": (d) => d[0].map(x => x[0])},
    {"name": "text", "symbols": [(lexer.has("text") ? {type: "text"} : text)], "postprocess": (d) => ({ type: 'text', value: d[0].value })},
    {"name": "template$ebnf$1", "symbols": []},
    {"name": "template$ebnf$1$subexpression$1", "symbols": [{"literal":":"}, "transform"]},
    {"name": "template$ebnf$1", "symbols": ["template$ebnf$1", "template$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "template", "symbols": [{"literal":"${"}, "subject", "template$ebnf$1", {"literal":"}"}], "postprocess": parseTemplate},
    {"name": "matchIndex", "symbols": [(lexer.has("matchIndex") ? {type: "matchIndex"} : matchIndex)], "postprocess": parseMatchIndex},
    {"name": "subject", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": (d) => d[0].value},
    {"name": "transform", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), {"literal":"("}, "arguments", {"literal":")"}], "postprocess": parseTransform},
    {"name": "arguments", "symbols": [], "postprocess": () => []},
    {"name": "arguments", "symbols": ["_", "value", "_"], "postprocess": (d) => [d[1]]},
    {"name": "arguments$ebnf$1", "symbols": []},
    {"name": "arguments$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "value"]},
    {"name": "arguments$ebnf$1", "symbols": ["arguments$ebnf$1", "arguments$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "arguments", "symbols": ["_", "value", "arguments$ebnf$1", "_"], "postprocess": extractArguments},
    {"name": "value", "symbols": ["object"], "postprocess": id},
    {"name": "value", "symbols": ["array"], "postprocess": id},
    {"name": "value", "symbols": ["number"], "postprocess": id},
    {"name": "value", "symbols": ["string"], "postprocess": id},
    {"name": "value", "symbols": ["regex"], "postprocess": id},
    {"name": "value", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": id},
    {"name": "value", "symbols": [{"literal":"true"}], "postprocess": () => true},
    {"name": "value", "symbols": [{"literal":"false"}], "postprocess": () => false},
    {"name": "value", "symbols": [{"literal":"null"}], "postprocess": () => null},
    {"name": "object", "symbols": [{"literal":"{"}, "_", {"literal":"}"}], "postprocess": () => ({})},
    {"name": "object$ebnf$1", "symbols": []},
    {"name": "object$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "pair"]},
    {"name": "object$ebnf$1", "symbols": ["object$ebnf$1", "object$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "object", "symbols": [{"literal":"{"}, "_", "pair", "object$ebnf$1", "_", {"literal":"}"}], "postprocess": extractObject},
    {"name": "array", "symbols": [{"literal":"["}, "_", {"literal":"]"}], "postprocess": () => []},
    {"name": "array$ebnf$1", "symbols": []},
    {"name": "array$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "value"]},
    {"name": "array$ebnf$1", "symbols": ["array$ebnf$1", "array$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "array", "symbols": [{"literal":"["}, "_", "value", "array$ebnf$1", "_", {"literal":"]"}], "postprocess": extractArray},
    {"name": "number", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": (d) => Number(d[0].value)},
    {"name": "string", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": d => d[0].value.slice(1, -1)},
    {"name": "regex", "symbols": [(lexer.has("regex") ? {type: "regex"} : regex)], "postprocess": parseRegex},
    {"name": "pair", "symbols": ["key", "_", {"literal":":"}, "_", "value"], "postprocess": (d) => [d[0], d[4]]},
    {"name": "key", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": id},
    {"name": "_", "symbols": []},
    {"name": "_", "symbols": [(lexer.has("space") ? {type: "space"} : space)], "postprocess": (d) => null}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
