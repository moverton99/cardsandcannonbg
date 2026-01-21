# Cards and Cannon — Authoritative Rules Reference

This directory contains the authoritative rules and content definitions for the game **Cards and Cannon**.

Any AI, tool, or code generator working on this project MUST treat the files in this directory as the single source of truth for game behavior. Do not invent, infer, or assume rules beyond what is explicitly defined here.

## Files and Responsibilities

### rules.yaml
This file defines the **game engine**:
- Turn structure and phases
- Board layout and zones
- State definitions (FaceDown, Exposed, Operational, etc.)
- Global constraints (hand limit, deployment rules)
- Passive rules and triggers
- Win conditions
- The complete canonical list of allowed verbs (actions)

All game logic must be derived from `rules.yaml`.  
If a behavior is not defined here, it does not exist.

### units.json
This file defines all **Unit (Asset) cards**:
- Unit identity and weight
- Activate effects
- Primary Actions
- Choices, costs, and conditions

Unit definitions may ONLY reference verbs and terms defined in `rules.yaml`.  
Units do not define new rules or mechanics.

### events.json
This file defines all **Event cards**:
- When an Event may be played
- Its immediate effects

Event definitions may ONLY reference verbs and terms defined in `rules.yaml`.  
Events do not modify the turn structure unless explicitly stated.

## Authoritative Usage Rules

- `rules.yaml` is authoritative over all other descriptions.
- `units.json` and `events.json` are data files interpreted through `rules.yaml`.
- If there is a conflict, ambiguity, or omission:
  - Prefer `rules.yaml`
  - Do NOT infer missing rules
  - Flag the issue instead of guessing

## Scope

This reference applies to:
- Rules explanations
- Game simulations
- AI players
- UI logic
- Validation and testing code

Do not use external examples, genre conventions, or assumptions from other games unless explicitly encoded in these files.
