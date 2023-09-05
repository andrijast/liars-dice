
Communication between server and an AI bot is done via **TCP/IP sockets** with messages in **JSON** format. Therefore, write your bot in any language where you feel the most comfortable with these two.

Message passing is done in a request-response manner, meaning, after server sends a message, bot should reply *synchronously* with the same `message_id` field. This is the *only* means of communication.

## Message formats

Following are JSON message formats given in TypeScript notation.

First of all, let's define some ancillary types to make the API more readable:

```ts
type IdType = string;
type Ordinal = number;
type PlayerID = Ordinal;
type Yourself = 0;
type EmptyPlayer = -1;
type Face = 1 | 2 | 3 | 4 | 5 | 6;
type Count = Ordinal;
type Bid = [Face, Count];
type EmptyBid = [0, 0];
```

### Server to client

Server can send two types of messages to a client. First one is when a move was made. It provides necessary information and expects a client to reply.

```ts
interface move_request {
    subject: "move_request";
    message_id: IdType;
    game_number: Ordinal;
    round_number: Ordinal;
    move_number: Ordinal;
    your_hand: Face[];
    other_hands: [PlayerID | Yourself, Count][]; // sorted by playing order
    last_bid: Bid | EmptyBid; // empty means first move in the round
}
```

Second type of message is a broadcast which is meant to notify that a round (or game) is over. Client should not respond to these type of messages.

```ts
interface round_over {
    subject: "round_over";
    game_number: Ordinal;
    round_number: Ordinal;
    state: [PlayerID | Yourself, Count][];
    round_loser: PlayerID;
    round_challenger: PlayerID | EmptyPlayer; // empty means round is lost due to an invalid move
    game_winner: PlayerID | EmptyPlayer; // empty means game is not over yet
}
```

### Client to server

Client should answer only to the first type of message from the server (`move_request`). You should not "pass" if it's your turn or make a bid if it's not your turn.

```ts
interface move_response {
    message_id: IdType;
    move: "pass" | "challenge" | Bid;
}
```

You can also send a message containing your name, preferably at the beginning, right after the connection is made.

```ts
interface set_name {
    name: string;
}
```

## Clarifications

The API should be pretty clear from the information above, or at least straightforward enough to be able to deduce other details. However, if you still have some confusion, here are some key takeaways to keep in mind:

- Field `other_hands` is an array of pairs of numbers where first one contains the ID of a player and second how many dice that player has left. It is sorted by the playing order. Field `state` is very similar, except it contains all players (even the ones with 0 dice left), and is not necessarily sorted in any way.
- Here's how you can derive other information from the data given in `move_request` message:
    - It's the first move in the round if: `last_bid == EmptyBid`
    - Previous bid was made by the player whose ID is in the last element of `other_hands` array (obviously if it's not the first move)
    - Next player to make a move is the one whose ID is in the first element of `other_hands` array
    - It's your turn if that ID is `0` aka. `Yourself`
- Your move will be considered invalid and you'll lose the round if:
    - You don't respect specified message format
    - You don't answer nothing within 3 seconds
    - You answer with "pass" on your turn
- Once you lose, you will only receive `round_over` messages for the rest of that game.
- Round-robin principle is on duty. If multiple players do the same action (invalid move, challenge), action by the next player in playing order will be acknowledged.
- Name can be set only once (subsequent `set_name` messages will not be taken into account), and is suggested to be set as soon as possible.
