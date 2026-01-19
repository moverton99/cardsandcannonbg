This is the complete content for your GAME_SPECS.md file. It is designed to be the "source of truth" for your Antigravity agent, providing the necessary logic and structural context without the distraction of inline citations.

GAME SPECS: Cards and Cannon
1. Overview
Cards and Cannon is a competitive lane-based game of logistics. Players manage a "pipeline" of assets across three Columns (Left, Center, Right), moving units from the Rear to the Front to seize control.

2. Game State Structure (G)
The board is divided into three shared Columns. Each player has three distinct Lines (slots) per column:

Rear (Depot): Where cards are first deployed (face-down).

Reserve: The staging area (face-down).

Front: The active engagement zone.

Exposed Status: The unit has entered the Front but is not yet Operational (face-up).

Operational Status: The unit is readied and can perform Primary Actions or control the Front.

3. The Phase Machine (Turn Structure)
Every turn must proceed through these five phases in order:

Supply Phase:

Draw: Active player draws 1 card.

Hand Check: Strictly enforce a 7-card hand limit. Discard down immediately if over.

Logistics Phase:

Column Action: Choose ONE Column to perform either an Advance or a Withdraw.

Advance: Move assets forward if the slot ahead is empty (Reserve to Front first, then Rear to Reserve).

Withdraw: Return an Exposed or Operational asset from the Front to your hand.

Events: Event cards may be played for free and do not count as the Column action.

Arrival Phase (Activate):

Triggered if an asset entered the Front during the Logistics Phase.

Reveal: Asset flips face-up (becomes Exposed).

Activate: Resolve any "Activate:" ability on the card.

Militia Recycle: If a Light asset is discarded by its own "Activate" ability, the owner draws 1 card.

Engagement Phase (Primary Action):

Readying: Assets that began the turn Exposed at the Front become Operational.

Primary Actions: Resolve the Primary Action of any Operational asset. Each asset acts once.

Capture the Guns: If a Primary Action destroys an enemy Heavy asset, the attacker draws 1 card.

Victory Momentum: If a Breakthrough token is earned during this phase, draw 1 card.

Commitment Phase (Deploy):

Ship: Player MUST place 1 card from their hand face-down into any empty Rear (Depot) slot on the board.

4. Key Mechanics & Special Rules
Overrun (Passive): If a Front slot is cleared (destroyed or withdrawn), the asset in that Column's Reserve immediately moves into the Front. It becomes Exposed, but does not trigger "Activate" abilities.

Asset Weights:

Light: Utility units, often self-discarding.

Medium: Balanced frontline units.

Heavy: Powerful units that can trigger "Escalation."

5. Unit Data
All specific card stats, abilities, and weights are defined in src/data/units.json. The engine should reference that file for all Primary and Activation logic.

6. Event Data
All specific event stats, abilities, and weights are defined in src/data/events.json. The engine should reference that file for all Event logic.

7. Deck Data
All specific deck stats, abilities, and weights are defined in src/data/deck.json. The engine should reference that file for all Deck logic.

8. Win Conditions
A player wins immediately if they satisfy any of the following:

Front Control: Control 2 Fronts simultaneously at the end of their turn (Player has an Operational asset; opponent has none).

Breakthroughs: Reach 2 Breakthrough tokens.

Escalation: The first time a player resolves a Heavy asset's Primary Action.

Decisive Breach: Removing an asset from a Front the opponent controlled at the start of the turn.

Collapse: The opponent begins their turn with no assets on the board and no cards in hand.