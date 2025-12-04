// Initialze netcode-related DOM elements
const hostButton = document.querySelector('.host-button');
const joinButton = document.querySelector('.join-button');
const hostCode = document.querySelector('.host-code');
const joinCode = document.querySelector('.join-code');
const sendButton = document.querySelector('.send');
const actionFields = document.querySelectorAll('.action-field');

// Create connection handling variables
let connectMode = 'none';
let peer = null;
let otherPeer = null;
let peerID = null;
let myActions = [];
let theirActions = [];

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

//TODO
function handleData(data) {
    if (theirActions.length === 0) {
        theirActions = data;
        if (myActions.length !== 0) {
            executeActions([...myActions, ...theirActions], baseBoard);
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
    if (myActions.length === 0) {
        actionFields.forEach((field, i) => {
            myActions.push(...parseActions(field.value, i + 1));
            field.value = "";
        })
        otherPeer.send(myActions);
        if (theirActions.length !== 0) {
            executeActions([...myActions, ...theirActions], baseBoard);
        }
    }
});