// TODO: add victory screen and new game

// Assign the player's team, green by default (as opposed to purple)
let playerTeam = "g";

// initialize board buttons
const boardButtons = document.querySelectorAll('.board-button');

// Initialize canvas
const arrowCanvas = document.querySelector('[id="arrows"]');
const arrowCanvasContext = arrowCanvas.getContext('2d');

// Initialize action menu
const actionMenu = document.querySelector('.action-menu');
const actionSelectors = document.querySelectorAll('.action-selector');

// Initialize midscreen
const phaseSelectors = document.querySelectorAll('.phase-selector');
const sendButton = document.querySelector('.send');
const actionFields = document.querySelectorAll('.action-field');

// Time in ms between actions (hehe ebil number)
let animDelay = 666;

// Take in a position and give the opposite square (e.g. "f3" -> "c6")
function invertPosition(position) {
    if (position.length != 2) {
        return null;
    }

    const colIndex = position[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rowIndex = 8 - parseInt(position[1], 10);

    return String.fromCharCode('h'.charCodeAt(0) - colIndex) + (rowIndex + 1);
}

// Go from being player 1 to player 2
function flipBoard() {
    boardButtons.forEach(button => {
        button.name = invertPosition(button.name);
    });
    if (playerTeam === "g") {
        playerTeam = "p";
    } else {
        playerTeam = "g";
    }
    renderBoard(baseBoard);
}

// Parse a text string into an array of valid action objects
function parseActions(field, phase) {
    if (field.length % 5 !== 0) {
        return [];
    }
    const actionList = [];
    const fieldArr = field.split('');

    while (fieldArr.length > 0) {
        const newAction = {};
        newAction.location = fieldArr.splice(0, 2).join('');
        newAction.notation = fieldArr.splice(0, 1).join('');
        newAction.target = fieldArr.splice(0, 2).join('');
        newAction.team = playerTeam;
        newAction.phase = phase;
        actionList.push(newAction);
    }

    return actionList;
}

// initialize favour counter
const favourCounter = document.querySelector('.favour-count');

// create BoardState class
class BoardState {
    constructor(baseToCopy = false) {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        if (baseToCopy) {
            baseToCopy.board.forEach((row, x) => {
                row.forEach((piece, y) => {
                    if (piece) {
                        this.board[x][y] = piece.clone();
                    }
                });
            });
            this.favour = baseToCopy.favour;
        } else {
            this.favour = 0;
        }
    }

    getPieceAndCoords(position) {
        if (position.length != 2) {
            return null;
        }

        let colIndex = position[0].charCodeAt(0) - 'a'.charCodeAt(0);
        let rowIndex = 8 - parseInt(position[1], 10);

        if (rowIndex < 0 || rowIndex > 7 || colIndex < 0 || colIndex > 7) {
            return null;
        }

        //        if (playerTeam === "p") {
        //            colIndex = 7 - colIndex;
        //            rowIndex = 7 - rowIndex;
        //        }

        return [this.board[rowIndex][colIndex], rowIndex, colIndex];
    }
    getPiece(position) {
        if (position.length != 2) {
            return null;
        }

        let colIndex = position[0].charCodeAt(0) - 'a'.charCodeAt(0);
        let rowIndex = 8 - parseInt(position[1], 10);

        if (rowIndex < 0 || rowIndex > 7 || colIndex < 0 || colIndex > 7) {
            return null;
        }

        //        if (playerTeam === "p") {
        //            colIndex = 7 - colIndex;
        //            rowIndex = 7 - rowIndex;
        //        }

        return this.board[rowIndex][colIndex];
    }
}

// create board to use as base
const baseBoard = new BoardState();


// create function to visually update all pieces
function renderBoard(boardToRender = baseBoard) {
    const favourAdvantage = (() => {
        switch (Math.sign(boardToRender.favour)) {
            case 1: return "Green";
            case -1: return "Purple"
            default: return "Neutral";
        }
    })();
    favourCounter.innerHTML = `Favour: ${boardToRender.favour} (${favourAdvantage})`;


    boardButtons.forEach(button => {
        const piece = boardToRender.getPiece(button.name);
        const healthBar = button.querySelector(".health-bar");
        healthBar.innerHTML = "";

        let spriteName = "";
        if (piece) {
            let resting = "";
            if (piece.isResting) {
                resting = "_resting";
            }
            spriteName = `Sprites/${piece.type}_${piece.team}${resting}.png`;

            const currentHealth = piece.currentHealth;
            const missingHealth = piece.maxHealth - currentHealth;

            for (let i = 0; i < missingHealth; i++) {
                const healthSprite = document.createElement("img");
                healthSprite.src = "Sprites/HP_0.png";
                healthBar.appendChild(healthSprite);
            }

            for (let i = 0; i < currentHealth; i++) {
                const healthSprite = document.createElement("img");
                healthSprite.src = "Sprites/HP_1.png";
                healthBar.appendChild(healthSprite);
            }
        }
        button.querySelector(".piece").src = spriteName;

    });
}

// Create action objects. The order they appear is the order they are executed.
const actionObjects = [
    {
        type: "move",
        range: 1,
        exe(actionList, targetBoard, targetedSpaces) {
            // Create a set of successful move actions and failed move actions
            const pass = new Set();
            const fail = new Set();

            // Fail all colliding move actions
            actionList.forEach(action => {
                if (fail.has(action)) {
                    return;
                }

                actionList.forEach(otherAction => {
                    if (action !== otherAction && action.target === otherAction.target) {
                        fail.add(action);
                        fail.add(otherAction);
                        return;
                    }
                });
            });

            // Recursive function performed by each move to check its target and add itself to pass/fail set
            function passFail(action, root) {
                if (pass.has(action) || action === root) {
                    return true;
                } else if (fail.has(action)) {
                    return false;
                }

                if (!root) {
                    root = action;
                }

                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);

                if (targetPiece === null) {
                    pass.add(action);
                    return true;
                }

                if (targetPiece.currentAction !== "move") {
                    fail.add(action);
                    return false;
                }

                const otherAction = actionList.find(act => act.location === action.target);

                if (otherAction.target === action.location && root !== action && root !== otherAction) {
                    fail.add(action);
                    return false;
                }

                return passFail(otherAction, root);

            }

            const done = new Set();

            function executeMove(action, holder) {
                if (!done.has(action)) {
                    const [lRow, lCol] = positionFromString(action.location);
                    const [tRow, tCol] = positionFromString(action.target);
                    const otherAction = actionList.find(act => act.location === action.target);

                    if (holder) {
                        [targetBoard.board[tRow][tCol], holder] = [holder, targetBoard.board[tRow][tCol]];
                        done.add(action);
                        targetedSpaces[tRow][tCol] = true;
                        if (holder) {
                            executeMove(otherAction, holder);
                        }
                    } else if (otherAction === undefined || otherAction.target !== action.location) {
                        [holder, targetBoard.board[lRow][lCol]] = [targetBoard.board[lRow][lCol], holder];
                        [targetBoard.board[tRow][tCol], holder] = [holder, targetBoard.board[tRow][tCol]];
                        targetedSpaces[tRow][tCol] = true;
                        done.add(action);
                        if (holder) {
                            executeMove(otherAction, holder);
                        }
                    } else {
                        [targetBoard.board[lRow][lCol], targetBoard.board[tRow][tCol]] = [targetBoard.board[tRow][tCol], targetBoard.board[lRow][lCol]];
                        targetedSpaces[tRow][tCol] = true;
                        targetedSpaces[lRow][lCol] = true;
                        done.add(action);
                        done.add(otherAction);
                    }
                }
            }

            actionList.forEach(action => {
                if (passFail(action)) {
                    executeMove(action, null);
                }
            });
        }
    },
    {
        type: "block",
        range: 0,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const [lRow, lCol] = positionFromString(action.location);
                targetBoard.board[lRow][lCol].isBlocking = true;
            });
        }
    },
    {
        type: "poke",
        range: 2,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);
                if (targetPiece) {
                    targetPiece.damage(1);
                } else {
                    const actingPiece = targetBoard.getPiece(action.location);
                    actingPiece.isResting = true;
                }
                targetedSpaces[tRow][tCol] = true;
            });
        }
    },
    {
        type: "shove",
        range: 1,
        exe(actionList, targetBoard, targetedSpaces) {
            // Create a set of successful shove actions and failed shove actions
            const pass = new Set();
            const fail = new Set();

            // Create series of "fake" shove actions performed by targeted pieces
            const fakeShoves = [];

            function failAll(action) {
                if ("root" in action) {
                    action.root.children.forEach(subAction => {
                        fail.add(subAction);
                    })
                    fail.add(action.root);
                } else {
                    action.children.forEach(subAction => {
                        fail.add(subAction);
                    })
                    fail.add(action);
                }
            }

            function checkAction(action) {
                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);
                if (targetPiece === null) {
                    return;
                }
                if (targetPiece.currentAction != "shove") {
                    const [lRow, lCol] = positionFromString(action.location);
                    const newTarget = positionFromID((2 * tRow) - lRow, (2 * tCol) - lCol);
                    if (newTarget) {
                        const newAction = { location: action.target, target: newTarget }
                        if ("root" in action) {
                            newAction.root = action.root;
                            action.root.children.push(newAction);
                        } else {
                            newAction.root = action;
                            action.children = [newAction];
                        }
                        fakeShoves.push(newAction);
                        checkAction(newAction);
                    } else {
                        failAll(action);
                    }
                }
            }
            actionList.forEach(action => {
                checkAction(action);
            });

            // Add all fake actions to action list
            let allShoves = [...actionList, ...fakeShoves];

            // Fail all colliding shove actions
            allShoves.forEach(action => {
                if (fail.has(action)) {
                    return;
                }

                allShoves.forEach(otherAction => {
                    if (action !== otherAction && action.target === otherAction.target) {
                        fail.add(action);
                        fail.add(otherAction);
                        return;
                    }
                });
            });

            // Recursive function performed by each shove to check its target and add itself to pass/fail set
            function passFail(action, root) {
                if (pass.has(action) || action === root) {
                    return true;
                } else if (fail.has(action)) {
                    failAll(action);
                    return false;
                }

                if (!root) {
                    root = action;
                }

                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);

                if (targetPiece === null) {
                    pass.add(action);
                    return true;
                }

                const otherAction = allShoves.find(act => act.location === action.target);

                if (otherAction.target === action.location && root !== action && root !== otherAction) {
                    fail.add(action);
                    return false;
                }

                return passFail(otherAction, root);

            }

            const done = new Set();

            function executeMove(action, holder) {
                if (!done.has(action)) {
                    const [lRow, lCol] = positionFromString(action.location);
                    const [tRow, tCol] = positionFromString(action.target);
                    const otherAction = allShoves.find(act => act.location === action.target);

                    if (holder) {
                        [targetBoard.board[tRow][tCol], holder] = [holder, targetBoard.board[tRow][tCol]];
                        done.add(action);
                        targetedSpaces[tRow][tCol] = true;
                        if (holder) {
                            executeMove(otherAction, holder);
                        }
                    } else if (otherAction === undefined || otherAction.target !== action.location) {
                        [holder, targetBoard.board[lRow][lCol]] = [targetBoard.board[lRow][lCol], holder];
                        [targetBoard.board[tRow][tCol], holder] = [holder, targetBoard.board[tRow][tCol]];
                        targetedSpaces[tRow][tCol] = true;
                        done.add(action);
                        if (holder) {
                            executeMove(otherAction, holder);
                        }
                    } else {
                        [targetBoard.board[lRow][lCol], targetBoard.board[tRow][tCol]] = [targetBoard.board[tRow][tCol], targetBoard.board[lRow][lCol]];
                        targetedSpaces[tRow][tCol] = true;
                        targetedSpaces[lRow][lCol] = true;
                        done.add(action);
                        done.add(otherAction);
                    }
                }
            }

            allShoves.forEach(action => {
                if (passFail(action)) {
                    executeMove(action, null);
                }
            });
        }
    },
    {
        type: "convert",
        range: 2,
        exe(actionList, targetBoard, targetedSpaces) {
            // Create a set of successful move actions and failed convert actions
            const pass = new Set();
            const fail = new Set();

            // Fail all colliding convert actions
            actionList.forEach(action => {
                if (fail.has(action)) {
                    return;
                }

                actionList.forEach(otherAction => {
                    if (action !== otherAction && action.target === otherAction.target) {
                        fail.add(action);
                        fail.add(otherAction);
                        return;
                    }
                });
            });

            actionList.forEach(action => {
                if (pass.has(action)) {
                    const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);
                    const actingPiece = targetBoard.getPiece(action.location);

                    if (targetPiece) {
                        if(targetPiece.team !== actingPiece.team) {
                            targetPiece.team = actingPiece.team;
                            addFavour(actingPiece.team, 3, targetBoard);
                        }
                    }
                    targetedSpaces[tRow][tCol] = true;
                }
            });
        }
    },
    {
        type: "cleave",
        range: 1,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const actingPiece = targetBoard.getPiece(action.location);
                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);
                if (targetPiece) {
                    targetPiece.damage(2);
                }
                actingPiece.isResting = true;
                targetedSpaces[tRow][tCol] = true;
            });

        }
    },
    {
        type: "pray",
        range: 0,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                addFavour(targetBoard.getPiece(action.location).team, 1, targetBoard);
                actingPiece.isResting = true;
            });
        }
    }
]

// create piece objexts
const pieceObjects = [
    {
        type: "soldier",
        health: 3,
        availableActions: [
            { type: "move", notation: ">" },
            { type: "poke", notation: "." },
            { type: "cleave", notation: "x" }
        ]
    },
    {
        type: "monk",
        health: 2,
        availableActions: [
            { type: "move", notation: ">" },
            { type: "convert", notation: "." },
            { type: "pray", notation: ";" }
        ]
    },
    {
        type: "golem",
        health: 4,
        availableActions: [
            { type: "shove", notation: ">" },
            { type: "cleave", notation: "x" },
            { type: "block", notation: ";" }
        ]
    }
];

// create Piece class
class Piece {
    constructor(type, team) {
        const pieceType = pieceObjects.find(pt => pt.type === type)
        try {

            if (!pieceType) {
                throw new Error(`Cannot create piece: type "${type}" does not exist`);
            }

            this.type = type;
            this.team = team;
            this.maxHealth = pieceType.health;
            this.availableActions = pieceType.availableActions;

            this.currentHealth = pieceType.health;
            this.currentAction = null;
            this.isResting = false;
            this.isBlocking = false;
            this.isDead = false;
        } catch (e) {
            console.log(e);
        }
    }

    clone() {
        const copy = new Piece(this.type, this.team);
        copy.currentHealth = this.currentHealth;
        copy.currentAction = this.currentAction;
        copy.isResting = this.isResting;
        copy.isBlocking = this.isBlocking;
        return copy;
    }

    damage(dmg) {
        if (this.isBlocking) {
            dmg -= 1;
            this.isBlocking = false;
        }
        this.currentHealth -= Math.max(dmg, 0);
        if (this.currentHealth <= 0) {
            this.isDead = true;
        }
    }

    resetAction() {
        this.currentAction = null;
        this.currentTarget = null;
        this.isBlocking = false;
    }
}

//create function to convert location string to two 2d indices
function positionFromString(position) {
    if (position.length != 2) {
        return null;
    }

    let colIndex = position[0].charCodeAt(0) - 'a'.charCodeAt(0);
    let rowIndex = 8 - parseInt(position[1], 10);

    if (rowIndex < 0 || rowIndex > 7 || colIndex < 0 || colIndex > 7) {
        return null;
    }

    //    if (playerTeam === "p") {
    //        colIndex = 7 - colIndex;
    //        rowIndex = 7 - rowIndex;
    //    }

    return [rowIndex, colIndex];
}

//create function to convert 2d coordinates to location string
function positionFromID(rowID, colID) {
    if (rowID < 0 || rowID > 7 || colID < 0 || colID > 7) {
        return null;
    }

    let position = String.fromCharCode('a'.charCodeAt(0) + colID);
    position += 8 - rowID;

    //    if (playerTeam === "p") {
    //        position = invertPosition(position);
    //    }

    return position;
}

// Sorts an array of actions into smaller arrays, sorted by phase
function sortActionsByPhase(actions) {
    let phase1 = [];
    let phase2 = [];
    let phase3 = [];

    actions.forEach(action => {
        switch (action.phase) {
            case 0:
                phase1.push(action);
                break;
            case 1:
                phase2.push(action);
                break;
            case 2:
                phase3.push(action);
                break;
        }
    });

    return [phase1, phase2, phase3];
}

// Execute a set of actions in a single phase
function executePhase(actions, targetBoard, rapid = false) {
    return new Promise((resolve) => {
        // Create working copy of action list
        const copiedActionList = [];
        actions.forEach(action => {
            copiedActionList.push(structuredClone(action));
        });


        // Culls moves performed by invalid pieces and invalid targets
        const exhaustedPieces = new Set();

        const validActions = Array(actionObjects.length).fill(null).map(() => []);
        copiedActionList.forEach(action => {
            try {
                const [actingPiece, lRow, lCol] = targetBoard.getPieceAndCoords(action.location);
                const [tRow, tCol] = positionFromString(action.target);

                // Check if there is a piece of the right team on the action location
                if (!actingPiece || actingPiece.team != action.team) {
                    // TODO - write error message
                    throw new Error(`${action.location}${action.notation}${action.target} failed: invalid piece`);
                }

                // Check to ensure acting piece can use specified move
                const usableAction = actingPiece.availableActions.find(at => at.notation === action.notation);

                if (!usableAction) {
                    // TODO - write error message
                    throw new Error(`Action ${action.location}${action.notation}${action.target} failed: invalid notation`);
                }
                if (actingPiece.isResting) {
                    // TODO - write error message
                    throw new Error(`Action ${action.location}${action.notation}${action.target} failed: piece is resting`);
                }

                // Check if piece has taken an action this turn already
                if (exhaustedPieces.has(actingPiece)) {
                    // TODO - write error message
                    throw new Error(`Action ${action.location}${action.notation}${action.target} failed: piece has too many actions.`);
                }

                // Check to ensure target is exactly within range
                const actionOrder = actionObjects.findIndex(ob => ob.type === usableAction.type);
                const actionObject = actionObjects[actionOrder];
                const targetDistance = Math.abs(lRow - tRow) + Math.abs(lCol - tCol);

                if (targetDistance != actionObject.range) {
                    // TODO - write error message
                    throw new Error(`Action ${action.location}${action.notation}${action.target} failed: target out of range`);
                }

                // Action is successful
                validActions[actionOrder].push(action);
                exhaustedPieces.add(actingPiece);
                actingPiece.currentAction = actionObjects[actionOrder].type;

            } catch (e) {
                console.log(e);
            }

        });

        // De-rests all pieces
        targetBoard.board.forEach(row => {
            row.forEach(piece => {
                if (piece !== null) {
                    piece.isResting = false;
                }
            });
        });

        renderBoard(targetBoard);

        let targetedSpaces = Array(8).fill(null).map(() => Array(8).fill(null));
        let currentDelay = 0;
        if (!rapid) {
            currentDelay += animDelay;
        }

        // Executes all remaining actions in order, culling for interruptions and dead pieces along the way
        actionObjects.forEach((obj, i) => {
            // Check for interruptions
            const successfulActions = [];
            validActions[i].forEach(action => {
                const [piece, lRow, lCol] = targetBoard.getPieceAndCoords(action.location);



                if (piece?.isDead) {
                    addFavour(oppositeTeam(piece.team), 3, targetBoard);
                    targetBoard.board[lRow][lCol] = null;
                } else if (!targetedSpaces[lRow][lCol]) {
                    successfulActions.push(action);
                    if (!rapid) {
                        drawAction(action.location, action.notation, action.target);
                    }
                }
            });
            if (successfulActions.length !== 0) {
                const actionList = [...successfulActions];
                if (!rapid) {
                    setTimeout(() => {
                        obj.exe?.(actionList, targetBoard, targetedSpaces);
                        renderBoard(targetBoard);
                    }, currentDelay);
                    currentDelay += animDelay;
                } else {
                    obj.exe?.(actionList, targetBoard, targetedSpaces);
                }
            }
        });

        // And after everything is done
        setTimeout(() => {
            // Resets all pieces
            targetBoard.board.forEach((row, x) => {
                row.forEach((piece, y) => {
                    if (piece !== null) {
                        piece.resetAction();
                        if (piece.isDead) {
                            addFavour(oppositeTeam(piece.team), 3, targetBoard);
                            targetBoard.board[x][y] = null;
                        }
                    }
                });
            });
            arrowCanvasContext.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
            if (!rapid) {
                renderBoard(targetBoard);
            }
            resolve();
        }, currentDelay);
    });
}


// TODO
function disableBoard() {
    actionFields.forEach(field => {
        for (let i = 0; i < field.children.length; i++) {
            field.children[i].disabled = true;
        }
    });
    boardButtons.forEach(button => {
        button.disabled = true;
    });
    phaseSelectors.forEach(button => {
        button.disabled = true;
    });
    boardButtons.forEach(button => {
        button.disabled = true;
    });
    sendButton.disabled = true;
}

function enableBoard() {
    actionFields.forEach(field => {
        for (let i = 0; i < field.children.length; i++) {
            field.children[i].disabled = false;
        }
    });
    boardButtons.forEach(button => {
        button.disabled = false;
    });
    phaseSelectors.forEach(button => {
        button.disabled = false;
    });
    boardButtons.forEach(button => {
        button.disabled = false;
    });
    sendButton.disabled = false;
}

// Execute a series of actions
async function executeActions(actions, targetBoard) {
    arrowCanvasContext.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
    const phases = sortActionsByPhase(actions);

    for (const phase of phases) {
        await executePhase(phase, targetBoard);
    }
    enableBoard();
}

function addFavour(team, amount, board) {
    console.log(`${team}, ${amount}, ${board}`);
    if (team === "g") {
        board.favour += amount;
    } else {
        board.favour -= amount;
    }
}

function oppositeTeam(team) {
    switch (team) {
        case "g": return "p";
        case "p": return "g";
        default: return null;
    }
}

// Function to draw images onto the arrow canvas
function drawAction(location, notation = "none", target = location) {
    let vLocation = "";
    let vTarget = "";
    if (playerTeam === "g") {
        vLocation = location;
        vTarget = target;
    } else {
        vLocation = invertPosition(location);
        vTarget = invertPosition(target);
    }

    const [lRow, lCol] = positionFromString(vLocation);
    const [tRow, tCol] = positionFromString(vTarget);

    const angleDEG = (Math.atan2(tRow - lRow, tCol - lCol) * 180) / Math.PI;
    const angleRAD = (Math.floor(angleDEG / 90) * Math.PI) / 2;

    const spriteImage = new Image();
    let spriteName = "Sprites/action";
    switch (notation) {
        case ";":
            spriteName += "_self.png";
            break;
        case "x":
            spriteName += "_close.png";
            break;
        case ".":
            if (lRow === tRow || lCol === tCol) {
                spriteName += "_far.png";
            } else {
                spriteName += "_far_d.png";
            }
            break;
        case ">":
            spriteName += "_move.png";
            break;
        default:
            spriteName += "_none.png";
            break;
    }
    spriteImage.src = spriteName;

    spriteImage.onload = function () {
        arrowCanvasContext.save()
        arrowCanvasContext.translate((lCol * 64) + 32, (lRow * 64) + 32);
        arrowCanvasContext.rotate(angleRAD);
        arrowCanvasContext.drawImage(spriteImage, -32, -32);
        arrowCanvasContext.restore();
    }
}

function drawAllActions(phase = 0) {
    arrowCanvasContext.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
    currentActions[phase].forEach(action => {
        drawAction(action.location, action.notation, action.target);
    });
}

// Input handling
let selectedSpace = "";
let selectedNotation = "";
let spacesInRange = [];

let mouseX = 0;
let mouseY = 0;

let currentActions = [[], [], []];
let currentPhase = 0;
let currentBoard = baseBoard;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

actionMenu.onmouseleave = () => {
    if (actionMenu.style.display !== "none") {
        selectedSpace = "";
        actionMenu.style.display = "none";
        drawAllActions(currentPhase);
    }
}

actionSelectors.forEach(button => {
    button.addEventListener('click', function () {
        if (selectedSpace !== "") {
            actionMenu.style.display = "none";
            const range = this.dataset.range;

            if (range === "0") {
                const newAction = createAction(selectedSpace, this.name, selectedSpace, playerTeam, currentPhase);
                currentActions[currentPhase].push(newAction);
                drawAllActions(currentPhase);
                selectedSpace = "";
            } else {
                selectedNotation = this.name;
                const [lRow, lCol] = positionFromString(selectedSpace);
                currentBoard.board.forEach((row, tRow) => {
                    row.forEach((space, tCol) => {
                        const distance = Math.abs(lRow - tRow) + Math.abs(lCol - tCol);
                        if (distance == range) {
                            target = positionFromID(tRow, tCol);
                            drawAction(target);
                            spacesInRange.push(target);
                        }
                    })
                })
            }
        }
    });
});

boardButtons.forEach(button => {
    button.addEventListener('click', function () {
        if (selectedNotation === "") {
            if (!attemptDelete(this.name)) {
                actionMenu.style.display = "block";
                actionMenu.style.left = `${mouseX - 8}px`;
                actionMenu.style.top = `${mouseY - 8}px`;
                selectedSpace = this.name;
                drawAction(selectedSpace);
            }
        } else if (selectedNotation !== "") {
            spacesInRange.forEach(space => {
                if (space === this.name) {
                    const newAction = createAction(selectedSpace, selectedNotation, space, playerTeam, currentPhase);
                    currentActions[currentPhase].push(newAction);
                }
            });
            drawAllActions(currentPhase);
            selectedSpace = "";
            selectedNotation = "";
            spacesInRange = [];
        }
    });
});

phaseSelectors.forEach(button => {
    button.addEventListener('click', function () {
        currentPhase = Number(this.name);
        let selectedSpace = "";
        let selectedNotation = "";
        let spacesInRange = [];

        simulateToPhase(currentPhase);
    })
})

function simulateToPhase(phase) {
    if (phase > 0) {
        const simBoard = new BoardState(baseBoard);

        for (let i = 0; i < phase; i++) {
            executePhase(currentActions[i], simBoard, true);
            renderBoard(simBoard);
        }
    } else {
        renderBoard(baseBoard);
    }
    drawAllActions(phase);
}

function createAction(location, notation, target, team, phase) {
    const actionButton = document.createElement("button");
    actionButton.innerHTML = `${location}${notation}${target}`;
    actionFields[phase].appendChild(actionButton);
    actionButton.addEventListener('click', function () {
        attemptDelete(this.innerHTML.substring(0, 2), phase);
        simulateToPhase(currentPhase);
    });

    const newAction = { location: location, notation: notation, target: target, team: team, phase: phase };
    return newAction;
}

function attemptDelete(locationToDelete, phase = currentPhase) {
    let actionFound = false;

    currentActions[phase].forEach((action, i) => {
        if (action.location === locationToDelete) {
            currentActions[phase].splice(i, 1);
            actionFields[phase].children[i].remove();
            drawAllActions(phase);
            actionFound = true;
        }
    });
    return actionFound;
}

function deleteAllInputActions() {
    currentActions.forEach((set, i) => {
        set.forEach(action => {
            attemptDelete(action.location, i);
        });
    });

    //actionFields.forEach(field => {
    //    field.innerHTML = "";
    //});
}

// Add pieces in the starting position
function newGame() {
    // First we clear all the pieces
    baseBoard.board.forEach(row => {
        row.forEach(piece => {
            piece = null;
        });
    });

    // Reset the favour count
    baseBoard.favour = 0;

    // Remove any remaining actions
    deleteAllInputActions();

    // Then we add all the pieces in their starting positions
    baseBoard.board[2][2] = new Piece("soldier", "p");
    baseBoard.board[1][2] = new Piece("golem", "p");
    baseBoard.board[1][3] = new Piece("monk", "p");
    baseBoard.board[1][4] = new Piece("soldier", "p");
    baseBoard.board[1][5] = new Piece("golem", "p");
    baseBoard.board[2][5] = new Piece("soldier", "p");

    baseBoard.board[5][2] = new Piece("soldier", "g");
    baseBoard.board[6][2] = new Piece("golem", "g");
    baseBoard.board[6][3] = new Piece("soldier", "g");
    baseBoard.board[6][4] = new Piece("monk", "g");
    baseBoard.board[6][5] = new Piece("golem", "g");
    baseBoard.board[5][5] = new Piece("soldier", "g");

    renderBoard(baseBoard);
}

newGame();
