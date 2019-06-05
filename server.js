const http = require('http');
const ws = require('ws');
const express = require('express');
const opn = require('opn');

const app = express();
app.use(express.static('static'))

const server = http.createServer(app);
server.listen(process.env.PORT || 1111, () => {
  // opn('http://localhost:1111');
  console.log('Open webpage: http://127.0.0.1:1111');
  console.log('Run `node client.js clientName` to start a client');
});

const connectionSetByUserId = new Map();
const userIdByConnection = new Map();
const userByUserId = new Map();

const wsServer = new ws.Server({
  server: server,
  verifyClient: (info, cb) => {
    const { headers, url } = info.req;
    const { token } = headers;

    if (!token && url !== '/web') {
      cb(false, 401, 'Unauthorized');
      return;
    }

    // check if the token is valid here
    if (!isTokenValid(token)) {
      cb(false, 401, 'Unauthorized');
      return;
    }

    cb(true);
  }
});


wsServer.on('connection', (conn, req) => {
  let user;

  if (req.headers.token) {
    user = getUserFromToken(req.headers.token);
  }

  if (req.url === '/web') {
    user = getUserFromToken('web');
  }

  let connectionSet = connectionSetByUserId.get(user.id) || new Set();
  connectionSet.add(conn);

  userIdByConnection.set(conn, user.id);
  connectionSetByUserId.set(user.id, connectionSet);
  userByUserId.set(user.id, user);

  console.log(`User ${user.id} connected`);
  console.log(
    `All connections:`,
    [...connectionSetByUserId.entries()].map(([k, v]) => [k, v.size])
  );
  notifyWebConnected(user);

  if (user.id === 'web') {
    for (let [userId, connections] of connectionSetByUserId.entries()) {
      if (connections.size > 0) {
        notifyWebConnected(userByUserId.get(userId));
      }
    }
  }

  function onMessage(message) {
    console.log(`Socket for user ${user.id} got message`, message);
    try {
      const json = JSON.parse(message);

      for (const userId of findRelatedUserIds(json)) {
        sendMessageToUserId(userId, json);
      }
    } catch (e) {
      console.error(`Error processing message`, e);
    }
  }

  function onClose() {
    console.log(`Socket for user ${user.id} closed`);
    notifyWebDisconnected(user);

    userIdByConnection.delete(conn);
    const connectionSet = connectionSetByUserId.get(user.id);

    if (connectionSet) {
      connectionSet.delete(conn);
      connectionSetByUserId.set(user.id, connectionSet);
    }

    conn.off('message', onMessage);
    conn.off('close', onClose);
  }

  conn.on('message', onMessage);
  conn.on('close', onClose);
});


function isTokenValid(token) {
  // do actual check here
  return true;
}


function getUserFromToken(token) {
  // return user from the db
  return {
    id: token,
    name: token
  };
}


function getWebConnections() {
  return connectionSetByUserId.get('web') || new Set();
}

function notifyWebConnected(user) {
  const msg = {
    eventType: 'USER_CONNECTED',
    user,
  };

  for (const connection of getWebConnections()) {
    connection.send(JSON.stringify(msg));
  }
}


function notifyWebDisconnected(user) {
  const msg = {
    eventType: 'USER_DISCONNECTED',
    user,
  };

  for (const connection of getWebConnections()) {
    connection.send(JSON.stringify(msg));
  }
}


function sendMessageToUserId(userId, message) {
  const connections = connectionSetByUserId.get(userId);
  for (const connection of connections) {
    connection.send(JSON.stringify(message));
  }
}

// Similar to finding related subscriptions
function findRelatedUserIds(message) {
  return [ message.to ];
}
