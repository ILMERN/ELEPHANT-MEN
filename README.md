# ELEPHANT-MEN
ELEPHANT MEN is a 1v1 simultaneous-turn multiplayer browser strategy game. Both players command a small army and are tasked with either earning 7+ "Favour" (which can be done by dealing damage, killing units, converting enemy units, and praying) or wiping the enemy out completely.

There are 3 phases per turn. Each player can choose 1 action from 1 of their units to perform per phase. The 3 phases are then executed in sequence. Actions occur in a specific order, as listed in [Actions](#actions) below.

---

## UNITS
### Soldier, 3HP
**Count: 3**
![Green Soldier](sprites/soldier_g.png) ![Purple Soldier](sprites/soldier_p.png)
These are your standard footsoldiers. They have a long-range attack, a close-range high-damage attack, and decent health. Versatile and strong.
- Move - This unit moves one space orthogonally.
- Poke - Deals 1 damage to a unit precisely 2 spaces away. If the attack misses (or is blocked), this unit must rest.
- Cleave - Deals 2 damage to a unit 1 space away. After the attack, this unit must always rest.

### Golem,  4HP
**Count: 2**
![Green Golem](sprites/golem_g.png) ![Purple Golem](sprites/golem_p.png)
Slow and unstoppable. They lack the long-range options of soldiers and monks, but in exchange they're extraordinarly durable and have a unique "shove" movement.
- Block - Reduces damage taken this phase from attacks by 1.
- Shove - This unit moves one space orthogonally, pushing all units in its path.
- Cleave - Deals 2 damage to a unit 1 space away. After the attack, this unit must always rest.

### Monk, 2HP
**Count: 1**
![Green Monk](sprites/monk_g.png) ![Purple Monk](sprites/monk_p.png)
A valuable long-range glass cannon. Capable of converting enemy units and passively generating favour. You only get one, so take care of it!
- Move - This unit moves one space orthogonally.
- Convert - Converts an enemy unit precisely 2 spaces away to this unit's colour and grants this player 3 Favour.
- Pray - This player gains 1 Favour. Afterwards, this unit must rest.

---

## ACTIONS
Resolution order:
[1. Move](#move)
[2. Block](#block)
[3. Poke](#poke)
[4. Shove](#shove)
[5. Convert](#convert)
[6. Cleave](#cleave)
[7. Pray](#pray)

### Move
Available to Soldiers and Monks, Move is a standard movement action to an adjacent space. Essential for avoiding enemy actions. If a unit attempts to Move to an occupied space, this action will fail UNLESS the unit on the occupied space is also Moving. Two units may swap positions in this way. If two units attempt to Move to the same space, both will fail. As Move is the first action in the resolution order, it cannot be interrupted. However, as it fails when targetting occupied spaces, it cannot be used to interrupt other actions either.

### Block
Unique to the Golem, Block makes the golem enter a Block stance until it receives an attack or attempts to perform another action. Blocking reduces incoming damage taken by one, nullifying a Poke and halving the damage of a Cleave. Attempting to perform an action with a Blocking Golem will instead cause the action to fail and the Golem to exit the block stance (Note: this happens at the point where the attempted action occurs e.g. cancelling a the Block with another Block action will cause the Golem to stop Blocking before any Poke actions. Cancelling the Block happens before other actions in that phase, so you'll take full damage against a Cleave if you cancel Block with a Cleave of your own). Block does NOT nullify the effects of Convert. Being Shoved does not break the Block stance.

### Poke
Unique to the Soldier, Poke is an attack that deals 1 damage to a unit precisely 2 spaces away (so it cannot target adjacent units). If the space Poke targets is unoccupied, or the targeted unit is a Blocking Golem, the Poking Soldier must rest and cannot act next phase. Poke is the fastest action capable of interrupting other actions. If two Soldiers Poke each other, they will both take 1 damage, even if this damage is enough to kill. Successfully dealing damage gives you 1 Favour for each damage dealt (negative for friendly fire), and killing a unit grants an extra 2 Favour (also negative for friendly fire).

### Shove
Unique to the Golem, Shove is similar to Move, but succeeds when targeting occupied spaces and able to push any number of units in a line. Follows many of the same rules as Move. If a unit would be Shoved off the edge of the board, the Shove fails and no units are moved. If two Golem's Shoves collide, both Shoves fail. Two Golems may swap positions by Shoving each other. Shove is too slow to evade Poke, but fast enough to evade Convert or Cleave. Shove interrupts the actions of all units is pushes.

### Convert
Unique to the Monk, Convert will convert a unit precisely 2 spaces away into the colour of the Monk. A successful Conversion will grant the army it's Converted to 3 Favour. If two Monks Convert each other, they will both change team. If two monks attempt to Convert the same unit, both will fail. You can use this to protect your own pieces from Conversion. There is no penalty for attempting to Convert your own pieces. Convert will never cause the Monk that used it to rest. Be careful: this has the same range as Poke, but it's slower.

### Cleave
Available to Soldiers and Golems, Cleave is an attack that deals 2 damage to an adjacent unit. High-risk, high-reward. A Cleaving unit must always rest and cannot act next phase unless interrupted by an earlier action. If blocked, Cleave will only deal 1 damage. Successfully dealing damage gives you 1 Favour for each damage dealt (negative for friendly fire), and killing a unit grants an extra 2 Favour (also negative for friendly fire).

### Pray
Unique to the Monk, Pray grants the player that used it 1 Favour. A Praying Monk must always rest and cannot act next phase unless interrupted by an earlier action.