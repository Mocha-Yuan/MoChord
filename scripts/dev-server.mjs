import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});

await server.listen();
server.printUrls();

setInterval(() => {}, 1_000_000);
