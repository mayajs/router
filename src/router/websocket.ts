import WebSocket from "ws";

let WSS: WebSocket.Server<WebSocket.WebSocket>;
let HAS_KILLED = false;

const clients: WebSocket[] = [];
const port = 6969;

function websocket() {
  WSS = new WebSocket.Server({ port });
}
