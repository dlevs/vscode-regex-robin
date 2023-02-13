import { parseTemplate, TemplateNode } from "./parseTemplate";

type MatchProcessor = (matches: string[]) => string;

export function compileTemplate(template: string) {
  const nodes = parseTemplate(template);
  const matchProcessors = nodes.map(processNode);

  return function populateTemplate(matches: string[]) {
    return matchProcessors.map((processor) => processor(matches)).join("");
  };
}

function processNode(node: TemplateNode): MatchProcessor {
  switch (node.type) {
    case "text":
      return () => node.value;
    case "expression": {
      const template = Function(
        "$0",
        "$1",
        "$2",
        "$3",
        "$4",
        "$5",
        "$6",
        "$7",
        "$8",
        "$9",
        "lineNumber",
        `return ${node.value}`
      );
      console.log(node.value);
      return (matches) => {
        const args = [
          matches[0] || "",
          matches[1] || "",
          matches[2] || "",
          matches[3] || "",
          matches[4] || "",
          matches[5] || "",
          matches[6] || "",
          matches[7] || "",
          matches[8] || "",
          matches[9] || "",
          10, // TODO:
        ];
        return template(...args);
      };
    }
    default:
      throw new SyntaxError("Unexpected node type: " + node.type);
  }
}
