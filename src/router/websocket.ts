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
    let interval = setInterval(waitConnection, 2000);

    async function waitConnection(){
      if (!openedSocketFlag ) await refreshPage();
    }

    async function refreshPage(){
      let  = new WebSocket("ws://localhost:${port}");

      return new Promise((resolve, reject) => {
        ws.addEventListener('open', () => {
          console.log("\x1b[32m[mayajs] MayaJS is running on development mode.");

          clearInterval(interval);
          hasError = false;
          resolve();

          if(refresh === true) {
            refresh = false;
            window.location.reload();
          }
        });

        ws.addEventListener('close',  () => {
          refresh = true;

          if(!hasError){
            console.log("\x1b[32m[mayajs] Refreshing browser");
          }
        });

        ws.addEventListener('error',  () => {
          if(!hasError) {
            console.log("\x1b[31m[mayajs] Failed to refresh browser. Waiting for connection...");
            clearInterval(interval);
          }

          ws.close();
          hasError = true;
          refresh = true;
        });
      });
    }
  </script>`;
}

export { websocket, wsDisconnect, refreshScript };
