import WebSocket from "ws";

let WSS: WebSocket.Server<WebSocket.WebSocket>;
let HAS_KILLED = false;
