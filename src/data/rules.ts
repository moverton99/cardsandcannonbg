export const RULES = {
    game: "Cards and Cannon",
    version: "1.1",
    terms: {
        card_types: {
            Asset: "A card that can be deployed to the board and occupy a Slot.",
            Event: "A card played from hand for an immediate effect, then discarded."
        },
        asset_weights: {
            Light: "Utility Assets, often disruptive or informational.",
            Medium: "Balanced combat Assets.",
            Heavy: "Powerful Assets that exert strong control."
        },
        board: {
            Column: "One of three shared lanes: West, Central, East.",
            Line: "A depth position within a Column: Rear, Reserve, Front.",
            Slot: "A single position in a Line and Column that may hold at most one of a player's Assets.",
            columns: ["West", "Central", "East"],
            lines_order_closest_to_player: ["Rear", "Reserve", "Front"],
            slot_capacity: 1
        },
        visibility_and_readiness: {
            FaceDown: "A card placed on the board with its identity hidden.",
            FaceUp: "A revealed card with its identity visible.",
            Exposed: "A FaceUp Asset at the Front that is not yet Operational.",
            Operational: "A ready Asset at the Front that may use Primary Actions and can control a Front."
        },
        removal: {
            Destroy: "Move the targeted Asset to its owner's discard pile.",
            Withdraw: "Return the targeted Asset from the Front to its owner's hand."
        },
        tokens: {
            Preparation: {
                description: "A generic counter representing setup or readiness for a future effect.",
                rules: [
                    "Preparation tokens have no inherent effect.",
                    "Their meaning is defined entirely by card text.",
                    "Any effect that adds, removes, spends, or checks tokens refers to Preparation tokens."
                ]
            }
        }
    },
    constraints: {
        hand_limit: 7,
        deploy_per_turn: 1
    },
    turn_structure: {
        phases: [
            {
                id: "supply",
                name: "Supply Phase",
                steps: [
                    {
                        id: "draw",
                        action: "draw_cards",
                        amount: 1,
                        notes: "This draw is guaranteed each turn and is not a limit on other draws."
                    },
                    {
                        id: "enforce_hand_limit",
                        action: "enforce_hand_limit",
                        max: 7
                    }
                ]
            },
            {
                id: "logistics",
                name: "Logistics Phase",
                steps: [
                    {
                        id: "play_events_optional",
                        action: "play_event",
                        optional: true,
                        notes: "Events may be played any number of times during this phase, before or after movement."
                    },
                    {
                        id: "movement_optional",
                        action: "choose_one_or_none",
                        optional: true,
                        options: [
                            {
                                id: "advance",
                                action: "advance_column",
                                params: {
                                    choose_column: true,
                                    order: ["Reserve->Front", "Rear->Reserve"],
                                    resolution: "Each movement step is evaluated independently and in order. If a destination Slot is empty, that move occurs, even if earlier or later steps do not."
                                }
                            },
                            {
                                id: "withdraw",
                                action: "withdraw_from_front",
                                params: {
                                    choose_column: true,
                                    eligible_front_states: ["Exposed", "Operational"]
                                }
                            }
                        ]
                    }
                ]
            },
            {
                id: "arrival",
                name: "Arrival Phase",
                condition: {
                    action: "any_asset_entered_front_this_turn",
                    during_phase: "logistics"
                },
                steps: [
                    {
                        id: "reveal_entering_assets",
                        action: "reveal_assets_that_entered_front",
                        result_state: "Exposed"
                    },
                    {
                        id: "resolve_activate_optional",
                        action: "resolve_activate",
                        scope: "each_asset_that_entered_front",
                        optional: true
                    }
                ]
            },
            {
                id: "engagement",
                name: "Engagement Phase",
                steps: [
                    {
                        id: "ready_exposed_assets",
                        action: "ready_assets",
                        params: {
                            condition: "asset_began_turn_Exposed_at_Front",
                            result_state: "Operational"
                        }
                    },
                    {
                        id: "resolve_primary_actions",
                        action: "resolve_primary_action",
                        scope: "any_operational_assets_you_control",
                        per_asset_limit: 1
                    },
                    {
                        id: "draw_on_heavy_destroyed",
                        action: "triggered_effect",
                        trigger: {
                            action: "asset_destroyed",
                            filter: {
                                destroyed_asset_weight: "Heavy",
                                cause: "PrimaryAction",
                                actor: "current_player"
                            }
                        },
                        effect: {
                            action: "draw_cards",
                            amount: 1
                        }
                    },
                    {
                        id: "draw_on_breakthrough",
                        action: "triggered_effect",
                        trigger: {
                            action: "breakthrough_gained",
                            during_phase: "engagement"
                        },
                        effect: {
                            action: "draw_cards",
                            amount: 1
                        }
                    }
                ]
            },
            {
                id: "commitment",
                name: "Commitment Phase",
                steps: [
                    {
                        id: "deploy",
                        action: "deploy_from_hand",
                        params: {
                            amount: 1,
                            face_down: true,
                            choose_column: true,
                            to_line: "Rear",
                            constraint: "Destination Slot must be empty."
                        }
                    }
                ]
            }
        ]
    },
    passive_rules: [
        {
            id: "overrun",
            name: "Overrun",
            trigger: {
                action: "front_slot_cleared",
                causes: ["Destroy", "Withdraw"]
            },
            effect: {
                action: "move_asset",
                params: {
                    from_line: "Reserve",
                    to_line: "Front",
                    if_present: true,
                    result_state: "Exposed"
                },
                restrictions: [
                    "This movement does not allow resolving Activate."
                ]
            }
        }
    ],
    win_conditions: [
        {
            id: "front_control",
            name: "Front Control",
            timing: "end_of_turn",
            condition: {
                action: "control_fronts",
                params: {
                    count_at_least: 2,
                    control_definition: {
                        you_have: "Operational Asset at Front",
                        opponent_has: "no Asset at Front"
                    }
                }
            },
            result: "win_immediately"
        },
        {
            id: "breakthroughs",
            name: "Breakthroughs",
            condition: {
                action: "breakthrough_tokens_at_least",
                params: {
                    count: 2
                }
            },
            result: "win_immediately",
            breakthrough_sources: [
                {
                    id: "escalation",
                    when: "first_time_each_player_resolves_a_Heavy_PrimaryAction"
                },
                {
                    id: "decisive_breach",
                    when: "you_remove_an_opponent_asset_from_a_Front_they_controlled_at_start_of_your_turn"
                },
                {
                    id: "collapse",
                    when: "opponent_begins_turn_with_no_assets_on_board_and_no_cards_in_hand"
                }
            ]
        }
    ]
};
