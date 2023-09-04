
export type Integer = number;
export type Ordinal = Integer; // starting from 1
export type Count = Integer;

export type PlayerID = Integer;
export type EmptyPlayer = 0;
export type Yourself = 0;

export type IdType = string;

export type MoveID = Integer;

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

// export type Bid = { value: Face | 0, count: number };
export type Bid = [Face, Count];
export type EmptyBid = [0, 0];

export type Hand = Face[];


// server -> bot

export interface outbound {
    game_number: Ordinal;
    round_number: Ordinal;
    move_number: Ordinal;
    your_hand: Face[];
    other_hands: [PlayerID | Yourself, Count][]; // sorted by playing order
    last_move: "first_move" | "bid_made" | "challenge_made" | "invalid_move";
    last_bid: Bid | EmptyBid;
    last_bidder: PlayerID | EmptyPlayer;
    last_loser: PlayerID | EmptyPlayer;
    last_challenger: PlayerID | EmptyPlayer;
}

export interface outbound_packet extends outbound {
    message_id: IdType;
}


// bot -> server

export interface inbound {
    move: "pass" | "challenge" | Bid;
}

export interface inbound_packet extends inbound {
    message_id: IdType;
}

