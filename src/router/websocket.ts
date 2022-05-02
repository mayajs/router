import WebSocket from "ws";

let WSS: WebSocket.Server<WebSocket.WebSocket>;
let HAS_KILLED = false;

const clients: WebSocket[] = [];
const port = 6969;

function websocket() {
  HAS_KILLED = false;

  WSS = new WebSocket.Server({ port });

  WSS.on("connection", (ws: WebSocket) => {
    ws.on("close", () => {
      console.log("\x1b[32m[mayajs] Refresh browser");
    });

    clients.push(ws);
  });
}

function wsDisconnect() {
  if (!HAS_KILLED) {
    clients.forEach((ws) => ws.close());
    WSS.close();
    HAS_KILLED = true;
  }
}
