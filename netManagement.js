// Initialze netcode-related DOM elements
const netcodeUI = document.querySelector('.netcode-ui');

const hostButton = document.querySelector('.host-button');

const cancelHostButton = document.querySelector('.cancel-host-button');
cancelHostButton.disabled = true;

const joinButton = document.querySelector('.join-button');

const hostCode = document.querySelector('.host-code');
const codeLength = 4;
hostCode.innerHTML = Array(codeLength).fill("-").join('');

const joinCode = document.querySelector('.join-code');

// How long the joiner should wait before timing out
const timeoutLimit = 2000;

// How long before sending another ping
const pingTimer = 5000;

// On unexpected disconnect, how many times should we attempt to reconnect
const reconnectAttempts = 10;

// Create connection handling variables
let connectMode = 'none';
let peer = null;
let otherPeer = null;
let peerID = null;
let myActions = [];
let myPreviousActions = [];
let myPreviousKey = 0;
let myKey = 0;
let iSent = 0; // 0 = unsent, 1 = hash sent, 2 = actions sent
let theirActions = [];
let theirHash = null;
let theySent = 0;
let iRematch = false;
let theyRematch = false;
let pingCleared = true;
let cancelNextPing = false;

// Create systems for generating peer IDs
const gameCode = 'ELMEN_';
function generateID() {
    const chars = 'ABCDEFGHJKLMNPRTWXY346789';
    return Array.from({ length: codeLength }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
}

// Hash function
function createHash(actions, key) {
    const payload = `${key}${actions}`
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        let chr = payload.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash;
}

// Host code
hostButton.addEventListener('click', function () {
    if (connectMode === 'none') {
        connectMode = 'host';
        cancelHostButton.disabled = false;
        peer = new Peer(gameCode + generateID());
        disableNetUI();
        if (playerTeam === "p") {
            flipBoard();
        }

        setTimeout(() => {
            if (hostCode.innerHTML === Array(codeLength).fill("-").join('')) {
                enableNetUI();
                resetNetVariables();
            }
        }, timeoutLimit);

        peer.on('open', function (id) {
            if (connectMode !== 'none') {
                peerID = id;
                hostCode.innerHTML = peerID.slice(peerID.length - codeLength, peerID.length);
            }
        })
        peer.on('connection', function (conn) {
            if (otherPeer === null) {
                cancelHostButton.disabled = true;
                netcodeUI.style.display = 'none';
                newGame();
                otherPeer = conn;
                setTimeout(startPinging, pingTimer);
                peer.removeAllListeners('open');
                peer.removeAllListeners('connection');
                otherPeer.on('data', handleData);
            }
        });
    }
});

// Join code
joinButton.addEventListener('click', function () {
    if (connectMode === 'none') {
        connectMode = 'join';
        peer = new Peer(gameCode + generateID());
        disableNetUI();
        if (playerTeam === "g") {
            flipBoard();
        }

        let connected = false;
        setTimeout(() => {
            if (!connected) {
                enableNetUI();
                resetNetVariables();
            }
        }, timeoutLimit);

        peer.on('open', function (id) {
            peerID = gameCode + joinCode.value.toUpperCase();
            otherPeer = peer.connect(peerID);
            otherPeer.on('open', function () {
                connected = true;
                netcodeUI.style.display = 'none';
                newGame();
                setTimeout(startPinging, pingTimer);
                peer.removeAllListeners('open');
                otherPeer.on('data', handleData);
            })
        })
    }
});

joinCode.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        joinButton.click();
    }
});


cancelHostButton.addEventListener('click', function () {
    resetNetVariables();
    enableNetUI();
    cancelHostButton.disabled = true;
});

rematchButton.addEventListener('click', function () {
    if (!iRematch) {
        otherPeer.send({ type: "rematch", contents: null });
        iRematch = true;
        if (theyRematch) {
            newGame();
            resetInputActions();
            iRematch = false;
            theyRematch = false;
        } else {
            rematchNotification.innerHTML = "Rematch request sent!";
        }
    }
});

newOpponentButton.addEventListener('click', function () {
    baseBoard.clearBoard();
    resetInputActions();
    resetNetVariables();
    enableNetUI();
    gameOverWindow.style.display = 'none';
    netcodeUI.style.display = 'block';
    renderBoard(baseBoard);
});

function handleData(data) {
    if (data.type === "hash") {
        cancelNextPing = true;
        if (otherPeer !== null && theySent === 0) {
            theirHash = data.contents;
            theySent = 1;
        }
    }

    else if (data.type === "actions") {
        if (otherPeer !== null) {
            cancelNextPing = true;
            if (theySent === 0) {
                theirActions = data.contents[0];
                theySent = 2;
                switch (iSent) {
                    case 0: break;
                    case 1:
                        otherPeer.send({ type: "actions", contents: [myActions, myKey] });
                    case 2:
                        executeActions([...myActions, ...theirActions], baseBoard);
                        resetInputActions();
                }
            } else if (theySent === 1) {
                let checkHash = createHash(data.contents[0], data.contents[1]);
                if (checkHash === theirHash) {
                    theirActions = data.contents[0];
                    theySent = 2;
                    switch (iSent) {
                        case 0: break;
                        case 1:
                            otherPeer.send({ type: "actions", contents: [myActions, myKey] });
                        case 2:
                            executeActions([...myActions, ...theirActions], baseBoard);
                            resetInputActions();
                    }
                }
            }
        }
    }

    else if (data.type === "ping") {
        if (otherPeer !== null && !cancelNextPing) {
            if (data.contents !== iSent) {
                switch (iSent) {
                    case 0:
                        otherPeer.send({ type: "actions", contents: [myPreviousActions, myPreviousKey] });
                        break;
                    case 1:
                        otherPeer.send({ type: "hash", contents: createHash(myActions, myKey) });
                        break;
                    case 2:
                        otherPeer.send({ type: "actions", contents: [myActions, myKey] });
                        break;
                }
            }
            otherPeer.send({ type: "pong", contents: null });
        }
    }

    else if (data.type === "pong") {
        pingCleared = true;
    }

    else if (data.type === "rematch") {
        if (!theySent) {
            theyRematch = true;
            if (iRematch) {
                newGame();
                resetInputActions();
                iRematch = false;
                theyRematch = false;
            } else {
                rematchNotification.innerHTML = "Opponent wants a rematch!";
            }
        }
    }
}

function handleDisconnect() {
    enableNetUI();
    resetNetVariables();
}

function disableNetUI() {
    hostButton.disabled = true;
    joinButton.disabled = true;
    joinCode.disabled = true;
}
function enableNetUI() {
    hostButton.disabled = false;
    joinButton.disabled = false;
    joinCode.disabled = false;
}

// initialize execute send button and action input fields
sendButton.addEventListener('click', function () {
    cancelNextPing = true;
    if (peerID === null && otherPeer === null) {
        console.log('no connection!');
        return;
    }
    if (iSent === 0) {
        disableBoard();
        currentActions.forEach((set, i) => {
            myActions.push(...set);
        });
        switch (theySent) {
            case 0:
                myKey = Math.random();
                otherPeer.send({ type: "hash", contents: createHash(myActions, myKey) });
                iSent = 1;
                break;
            case 1:
                otherPeer.send({ type: "actions", contents: [myActions, myKey] });
                iSent = 2;
                break;
            case 2:
                otherPeer.send({ type: "actions", contents: [myActions, myKey] });
                executeActions([...theirActions, ...myActions], baseBoard);
                resetInputActions();
                break;
        }
    }
});

function resetInputActions() {
    myPreviousActions = myActions;
    myPreviousKey = myKey;
    myActions = [];
    iSent = 0;
    theirActions = [];
    theirHash = null;
    theySent = 0;
    deleteAllInputActions();
    currentPhase = 0;
};

function resetNetVariables() {
    connectMode = 'none';
    peer = null;
    otherPeer = null;
    peerID = null;
    myActions = [];
    myPreviousActions = [];
    myPreviousKey = 0;
    iSent = 0;
    theirActions = [];
    theirHash = null;
    theySent = 0;
    iRematch = false;
    theyRematch = false;
    pingCleared = true;
    cancelNextPing = false;

    hostCode.innerHTML = Array(codeLength).fill("-").join('');
}

function attemptReconnect(attemptsRemaining) {
    if (!pingCleared) {
        if (attemptsRemaining > 0) {
            otherPeer = null;
            peer.removeAllListeners('connection');
            peer.removeAllListeners('open');
            if (connectMode === "host") {
                peer.on('connection', function (conn) {
                    if (otherPeer === null) {
                        pingCleared = true;
                        otherPeer = conn;
                        setTimeout(startPinging, pingTimer);
                        peer.removeAllListeners('connection');
                    }
                });
            } else if (connectMode === "join") {
                otherPeer = peer.connect(peerID);
                otherPeer.on('open', function () {
                    pingCleared = true;
                    setTimeout(startPinging, pingTimer);
                    peer.removeAllListeners('open');
                });
            }

            setTimeout(function () {
                attemptReconnect(attemptsRemaining - 1)
            }, timeoutLimit);
        } else {
            gameOver("", "Disconnection");
        }
    }
}

function startPinging() {
    if (connectMode !== "none") {
        if (cancelNextPing) {
            cancelNextPing = false;
            setTimeout(startPinging, pingTimer);
        }

        else if (pingCleared) {
            otherPeer.send({ type: "ping", contents: theySent });
            pingCleared = false;
            setTimeout(startPinging, pingTimer);
        }

        else {
            attemptReconnect(reconnectAttempts);
        }
    }
}