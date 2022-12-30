// These mocks allow us to run tests outside of VSCode, so we get much
// faster feedback, with much less friction than the approach currently
// documented on the VSCode docs site.
//
// Any exports used by this extension must be mocked here.

export const Uri = {
  parse() {
    return "Mock Uri";
  },
};

export const window = {
  createTextEditorDecorationType() {
    return "Mock TextEditorDecorationType";
  },
  showErrorMessage() {
    return "Mock showErrorMessage";
  },
};

export class Position {}
export class Range {}
