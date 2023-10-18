import { exit } from "process";

export const confirmContinue = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const input = require("cli-interact").getYesNo;
  const val: boolean = input(`Proceed?`);

  if (!val) {
    exit();
  }
};
