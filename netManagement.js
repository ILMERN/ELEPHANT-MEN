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
const timeoutLimit = 10000;

// Create connection handling variables
let connectMode = 'none';
let peer = null;
let otherPeer = null;
let peerID = null;
let myActions = [];
let iSent = false;
let theirActions = [];
let theySent = false;
let iRematch = false;
let theyRematch = false;

// Create systems for generating peer IDs
const gameCode = 'ELMEN_';
function generateID() {
    const chars = 'ABCDEFGHJKLMNPRSTWXYZ23456789';
    return Array.from({ length: codeLength }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
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
                otherPeer.on('data', function (data) {
                    handleData(data);
                });
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
            peerID = id;
            otherPeer = peer.connect(gameCode + joinCode.value.toUpperCase());
            otherPeer.on('data', function (data) {
                handleData(data);
            })
            otherPeer.on('open', function () {
                connected = true;
                netcodeUI.style.display = 'none';
                newGame();
            })
        })
    }
});

cancelHostButton.addEventListener('click', function () {
    resetNetVariables();
    enableNetUI();
    cancelHostButton.disabled = true;
});

rematchButton.addEventListener('click', function () {
    if (!iRematch) {
        otherPeer.send("rematch");
        iRematch = true;
        if (theyRematch) {
            newGame();
            resetInputActions();
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
    if (data === "rematch") {
        theyRematch = true;
        if (iRematch) {
            newGame();
            resetInputActions();
        } else {
            rematchNotification.innerHTML = "Opponent wants a rematch!";
        }
    } else if (!theySent) {
        theirActions = data;
        theySent = true;
        if (iSent) {
            executeActions([...myActions, ...theirActions], baseBoard);
            resetInputActions();
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
    if (peerID === null && otherPeer === null) {
        console.log('no connection!');
        return;
    }
    if (!iSent) {
        disableBoard();
        currentActions.forEach((set, i) => {
            myActions.push(...set);
        });
        otherPeer.send(myActions);
        iSent = true;

        if (theySent) {
            executeActions([...myActions, ...theirActions], baseBoard);
            resetInputActions();
        }
    }
});

function resetInputActions() {
    myActions = [];
    iSent = false;
    theirActions = [];
    theySent = false;
    deleteAllInputActions();
    currentPhase = 0;
};

function resetNetVariables() {
    connectMode = 'none';
    peer = null;
    otherPeer = null;
    peerID = null;
    myActions = [];
    iSent = false;
    theirActions = [];
    theySent = false;
    iRematch = false;
    theyRematch = false;

    hostCode.innerHTML = Array(codeLength).fill("-").join('');
}