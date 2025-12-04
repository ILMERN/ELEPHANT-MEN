// Assign the player's team, green by default (as opposed to purple)
let playerTeam = "g";

// initialize board buttons
const boardButtons = document.querySelectorAll('.board-button');

//
function invertPosition(position) {
    if (position.length != 2) {
        return null;
    }

    const colIndex = position[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rowIndex = 8 - parseInt(position[1], 10);

    return String.fromCharCode('h'.charCodeAt(0) - colIndex) + (rowIndex + 1);
}

//
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

// create listener for each board button
boardButtons.forEach(button => {
    button.addEventListener('click', function () {
        // TMP - log button pressed
        const square = this.name;
        console.log('Clicked square:', square);
    });
});

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
                })
            })
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
function renderBoard(boardToRender) {
    favourCounter.innerHTML = `Favour: ${boardToRender.favour}`;

    boardButtons.forEach(button => {
        const piece = boardToRender.getPiece(button.name);
        const healthBar = button.querySelector(".health-bar");
        healthBar.innerHTML = "";

        let spriteName = "";
        if (piece) {
            spriteName = `Sprites/${piece.type}_${piece.team}.png`;

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

    })
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
                })
            })

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

                if (targetPiece.currentAction !== "move" || targetPiece.isResting) {
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
            })
        }
    },
    {
        type: "block",
        range: 0,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const [lRow, lCol] = positionFromString(action.location);
                targetBoard.board[lRow][lCol].isBlocking = true;
            })
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
            })
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
            })

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
                })
            })

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

                if (targetPiece.isResting) {
                    fail.add(action);
                    return false;
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
            })
        }
    },
    {
        type: "convert",
        range: 2,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const [targetPiece, tRow, tCol] = targetBoard.getPieceAndCoords(action.target);
                const actingPiece = targetBoard.getPiece(action.location);

                if (targetPiece) {
                    targetPiece.team = actingPiece.team;
                }
                targetedSpaces[tRow][tCol] = true;
            })
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
            })

        }
    },
    {
        type: "pray",
        range: 0,
        exe(actionList, targetBoard, targetedSpaces) {
            actionList.forEach(action => {
                const actingPiece = targetBoard.getPiece(action.location);
                if (action.team === "g") {
                    targetBoard.favour += 1;
                }
                else {
                    targetBoard.favour -= 1;
                }
                actingPiece.isResting = true;
            })
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
            case 1:
                phase1.push(action);
                break;
            case 2:
                phase2.push(action);
                break;
            case 3:
                phase3.push(action);
                break;
        }
    })

    return [phase1, phase2, phase3];
}

// Execute a set of actions in a single phase
function executePhase(actions, targetBoard) {

    // Culls moves performed by invalid pieces and invalid targets
    const exhaustedPieces = new Set();

    const validActions = Array(actionObjects.length).fill(null).map(() => []);
    actions.forEach(action => {
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

    })

    // De-rests all pieces
    targetBoard.board.forEach(row => {
        row.forEach(piece => {
            if (piece !== null) {
                piece.isResting = false;
            }
        })
    })

    let targetedSpaces = Array(8).fill(null).map(() => Array(8).fill(null));

    // Executes all remaining actions in order, culling for interruptions and dead pieces along the way
    actionObjects.forEach((obj, i) => {
        // Check for interruptions
        const successfulActions = [];
        validActions[i].forEach(action => {
            const [piece, lRow, lCol] = targetBoard.getPieceAndCoords(action.location);

            if (!piece || piece.isDead) {
                targetBoard.board[lRow][lCol] = null;
            } else if (!targetedSpaces[lRow][lCol]) {
                successfulActions.push(action);
            }
        })
        obj.exe?.(successfulActions, targetBoard, targetedSpaces);
    })

    // Resets all pieces
    targetBoard.board.forEach((row, x) => {
        row.forEach((piece, y) => {
            if (piece !== null) {
                piece.resetAction();
                if (piece.isDead) {
                    targetBoard.board[x][y] = null;
                }
            }
        })
    })

    // Renders the board
    renderBoard(targetBoard);
}

// Execute a series of actions
function executeActions(actions, targetBoard) {
    const phases = sortActionsByPhase(actions);
    phases.forEach(phase => {
        executePhase(phase, targetBoard);
    })
}

// Add pieces in the starting position
baseBoard.board[1][2] = new Piece("golem", "p");
baseBoard.board[2][2] = new Piece("soldier", "p");
baseBoard.board[1][3] = new Piece("monk", "p");
baseBoard.board[1][4] = new Piece("soldier", "p");
baseBoard.board[2][5] = new Piece("soldier", "p");
baseBoard.board[1][5] = new Piece("golem", "p");

baseBoard.board[6][2] = new Piece("golem", "g");
baseBoard.board[5][2] = new Piece("soldier", "g");
baseBoard.board[6][3] = new Piece("soldier", "g");
baseBoard.board[6][4] = new Piece("monk", "g");
baseBoard.board[5][5] = new Piece("soldier", "g");
baseBoard.board[6][5] = new Piece("golem", "g");

renderBoard(baseBoard);
