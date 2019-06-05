const WebSocket = require('ws');


const args = process.argv.slice(2);
const clientId = args[0];

console.log('Starting client with id: ', clientId);

function tryConnect() {
  function tearDown() {
    wsClient.off('error', onError);
    wsClient.off('close', onClose);
    wsClient.off('open', onOpen);
  }

  function onError(e) {
    console.error(`Can't connect, will retry in 3 seconds`, e.message);
    tearDown();
    setTimeout(tryConnect, 3000);
  }

  function onClose() {
    console.error(`Socket closed, reconnecting`);
    tearDown();
    tryConnect();
  }

  function onOpen() {
    console.log('Connected to the server');
  }

  function onMessage(msg) {
    console.log('Recieved message', msg);
  }

  const headers = clientId ? { token: clientId } : {};

  const wsClient = new WebSocket(`ws://127.0.0.1:1111`, { headers });
  wsClient.on('error', onError);
  wsClient.on('close', onClose);
  wsClient.on('open', onOpen);
  wsClient.on('message', onMessage);
}

tryConnect();
