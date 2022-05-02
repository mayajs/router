import WebSocket from "ws";

let WSS: WebSocket.Server<WebSocket.WebSocket>;

const clients: WebSocket[] = [];
const port = 6969;

function websocket() {
  WSS = new WebSocket.Server({ port });

  WSS.on("connection", (ws: WebSocket) => {
    ws.on("close", () => {
      console.log("\x1b[32m[mayajs] Refresh browser");
    });

    clients.push(ws);
  });
}

function wsDisconnect() {
  clients.forEach((ws) => ws.close());
  WSS.close();
}

function refreshScript() {
  return `<script>
    let openedSocketFlag = null
    let refresh = false;
    let interval = setInterval(waitConnection, 3000);

    async function waitConnection(){
      if (!openedSocketFlag ) await refreshPage();
    }

    async function refreshPage(){
      let ws = new WebSocket("ws://localhost:${port}");
      return new Promise((resolve, reject) => {
        ws.addEventListener('open', () => {
          openedSocketFlag = true;

          if(refresh === true){
            refresh = false;
            resolve();
            window.location.reload();
          }
        });

        ws.addEventListener('close',  () => {
          openedSocketFlag = false;
          refresh = true;
        })
      })
    }
  </script>`;
}

export { websocket, wsDisconnect, refreshScript };
