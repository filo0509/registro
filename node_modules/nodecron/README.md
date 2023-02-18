Nodecron is a simple executable module to schedule running commands.

# Installation

```sh
npm install -g nodecron
```

# Usage

```
Usage: nodecron schedule command

Arguments:
  schedule: schedule in Later's text format
            (http://bunkat.github.io/later/parsers.html#text)
  command:  command to execute with optional arguments

Examples:
  nodecron "every 5 mins" date           # print the date every 5 minutes
  nodecron "at 10:15 am" node cleanup.js # run cleanup.js every day at 10:15
```
