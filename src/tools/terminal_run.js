const TerminalRun = {
  name: "terminal_run",
  description: "Execute a specified command in the terminal and return the result",
  params: {
    type: "object",
    properties: {
      command: {
        description: "The command to execute",
        type: "string"
      },
      args: {
        description: "Command arguments list",
        type: "string",
      },
      cwd: {
        description: "Command working directory",
        type: "string"
      }
    },
    required: ["command"]
  },
  getActionDescription({ command = "", args = "", cwd }) {
    if (!command) {
      return 'Invalid terminal command: missing command value';
    }
    return `${command} ${args}`.trim();
  }
};

module.exports = TerminalRun;