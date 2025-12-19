// Initialze netcode-related DOM elements
const hostButton = document.querySelector('.host-button');
const joinButton = document.querySelector('.join-button');
const hostCode = document.querySelector('.host-code');
const joinCode = document.querySelector('.join-code');

// Create connection handling variables
let connectMode = 'none';
let peer = null;
let otherPeer = null;
let peerID = null;
let myActions = [];
let iSent = false;
let theirActions = [];
let theySent = false;

// Create systems for generating peer IDs
const gameCode = 'ELMEN_';
const codeLength = 4;
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
        peer = new Peer(gameCode + generateID());
        disableNetUI();
        if (playerTeam === "p") {
            flipBoard();
        }

        peer.on('open', function (id) {
            peerID = id;
            hostCode.innerHTML = peerID.slice(peerID.length - codeLength, peerID.length);
        })
        peer.on('connection', function (conn) {
            console.log('Connected!');
            otherPeer = conn;
            otherPeer.on('data', function (data) {
                handleData(data);
            });
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

        peer.on('open', function (id) {
            peerID = id;
            otherPeer = peer.connect(gameCode + joinCode.value.toUpperCase());
            otherPeer.on('data', function (data) {
                handleData(data);
            })
            otherPeer.on('open', function () {
                console.log('Connected!');
            })
        })
    }
});


function handleData(data) {
    if (!theySent) {
        theirActions = data;
        theySent = true;
        if (iSent) {
            executeActions([...myActions, ...theirActions], baseBoard);
            resetInputActions();
        }
    }
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
        console.log(myActions);
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