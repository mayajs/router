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
    let hasError = false;
    let refresh = false;
    let interval = setInterval(waitConnection, 3000);

    async function waitConnection(){
      if (!openedSocketFlag ) await refreshPage();
    }

    async function refreshPage(){
        hasError = true;
      return new Promise((resolve, reject) => {
        ws.addEventListener('open', () => {
          openedSocketFlag = true;

          hasError = false;
            refresh = false;
            resolve();
            window.location.reload();
          }
        });

        ws.addEventListener('close',  () => {
          refresh = true;
        });

        ws.addEventListener('error',  () => {
          hasError = true;
          refresh = true;
        });
      });
    }
  </script>`;
}

export { websocket, wsDisconnect, refreshScript };