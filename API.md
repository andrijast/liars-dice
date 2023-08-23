
Communication between server and an AI bot is done via **TCP/IP sockets** with messages in **JSON** format. Therefore, you can write your bot in any language that supports these two.

Message passing is done in a request-response manner, meaning, after server sends a message, bot should reply *synchronously* with the same `message_id` field. This is the **only** means of communication.

## Message formats

Following are JSON message formats given in TypeScript notation.

Some ancillary types:

```ts
type Integer = number;
type Ordinal = Integer; // starting from 1
type PlayerID = Integer;
type NotAvailable = 0;
type Yourself = 0;
type Face = 1 | 2 | 3 | 4 | 5 | 6;
type Count = Integer;
type Bid = [Face, Count];
type EmptyBid = [0, 0];
```

### Server to client

```ts
export interface outbound {
    message_id: Integer;
    game_number: Ordinal;
    round_number: Ordinal;
    move_number: Ordinal;
    your_hand: Face[];
    other_hands: [PlayerID | Yourself, Count][]; // sorted by playing order
    last_move: "first_move" | "bid_made" | "challenge_made" | "invalid_move";
    last_bid: Bid | EmptyBid;
    last_bidder: PlayerID | NotAvailable;
    last_loser: PlayerID | NotAvailable;
    last_challenger: PlayerID | NotAvailable;
}
```

### Client to server

If it's your turn:
```ts
export interface inbound {
    message_id: Integer;
    move: "challenge" | Bid;
}
```

Otherwise:
```ts
export interface inbound {
    message_id: Integer;
    move: "pass" | "challenge";
}
```

## Key takeaways:

- Round-robin principle. If multiple players do the same action (invalid move, challenge), action by the next player in playing order will be acknowledged.
- Use your logic to derive conclusions.
