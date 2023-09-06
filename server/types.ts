
export type IdType = string;

export type Ordinal = number;
export type Count = Ordinal;

export type PlayerID = Ordinal;
export type Yourself = 0;
export type EmptyPlayer = -1;


export type Face = 1 | 2 | 3 | 4 | 5 | 6;

// export type Bid = { value: Face | 0, count: number };
export type Bid = [Face, Count];
export type EmptyBid = [0, 0];

export type Hand = Face[];


// --- MESSAGES ---

export interface move_request {
    subject: "move_request";
    game_number: Ordinal;
    round_number: Ordinal;
    move_number: Ordinal;
    your_hand: Face[];
    other_hands: [PlayerID | Yourself, Count][];
    last_bid: Bid | EmptyBid;
}

export interface round_over {
    subject: "round_over";
    game_number: Ordinal;
    round_number: Ordinal;
    state: [PlayerID | Yourself, Count][];
    round_loser: PlayerID;
    round_challenger: PlayerID | EmptyPlayer;
    game_winner: PlayerID | EmptyPlayer;
}

export interface move_response {
    move: "pass" | "challenge" | Bid;
}

export interface set_name {
    name: string;
}

export interface header {
    message_id: IdType;
}
