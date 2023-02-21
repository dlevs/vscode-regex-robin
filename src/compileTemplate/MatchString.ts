import { DocumentMatchGroup } from "../util/documentUtils";

// TODO: Just use this everywhere?
export class MatchString extends String {
  constructor(private group?: DocumentMatchGroup | null) {
    super(group?.match ?? "");
  }

  get lineNumber() {
    return this.group ? this.group.range.start.line + 1 : -1;
  }

  get columnNumber() {
    return this.group ? this.group.range.start.character + 1 : -1;
  }
}
