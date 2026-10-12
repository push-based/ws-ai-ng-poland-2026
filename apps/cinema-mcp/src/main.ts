import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createCinemaServer } from './server.js';
// The SDK entry negotiates modern and legacy protocol eras. Never log to stdout:
// stdout is reserved for the MCP wire protocol; diagnostics belong on stderr.
const handle = serveStdio(createCinemaServer, {
  onerror: (error) => console.error(error.message),
});
process.on('SIGINT', () => {
  void handle.close();
});
process.on('SIGTERM', () => {
  void handle.close();
});
