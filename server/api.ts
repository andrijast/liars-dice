

import { Bid, Hand, MoveID, PlayerID } from './game.ts'


export interface welcome {
    subject: "welcome",
    status_message: "OK" | "lobby is full",
    number_of_dice: number,
    number_of_players: number,
    current_player_count: number,
}

export interface game_start {
    subject: "game_start",
    number_of_dice: number,
    number_of_players: number,
    your_id: PlayerID,
}

export interface game_end {
    subject: "game_end",
    winner: PlayerID,
}

export interface round_start {
    subject: "round_start",
    state: [PlayerID, number][], // number of dice left to each player
    players_left: number, // number of players with non-zero dice
    your_hand: Hand,
    first_to_move: PlayerID,
}

export interface round_end {
    subject: "round_end",
    loser: PlayerID,
}


export interface move_made {
    subject: "move_made",
    move_id: MoveID,
    by_player: PlayerID,
    bid: Bid,
    next_to_move?: PlayerID,
}

export interface move_reply {
    subject: "move_reply",
    my_id: PlayerID,
    move_id: MoveID,
    challenge: boolean,
}

export interface your_turn {
    subject: "your_turn",
    last_move: MoveID,
    this_move: MoveID,
    currentBid: Bid,
}

export interface my_move {
    subject: "my_move",
    my_id: PlayerID,
    move_id: MoveID,
    bid: Bid,
}

export interface shutdown {
    subject: "shutdown",
    reason?: string,
}


export type message =
    | welcome
    | game_start
    | game_end
    | round_start
    | round_end
    | move_made
    | move_reply
    | your_turn
    | my_move
    | shutdown;

export type broadcast =
    | game_end
    | round_end
    | move_made
    | shutdown;
