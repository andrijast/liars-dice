

Communication is done via TCP/IP sockets with messages in JSON format. Therefore, you can write your bot in any language that supports these two.

All messages passed around must contain property `subject` as the first JSON entry which is a unique string to determine message type. It can be one of the following:

- `welcome`
- `game_start`
- `game_end`
- `round_start`
- `round_end`
- `move_made`
- `move_reply` *
- `your_turn`
- `my_move` *
- `shutdown`

Messages marked with `*` are sent by the bot while the others are received from the server.

Course of the game should be pretty much straightforward from the API, but here's a brief overview: When socket connection is established, player should revieve a `welcome` message. Once all the players have joined (lobby becomes full), the game will start (`game_start` message). Before each round, `round_start` message is sent containing useful information such as the hand you've rolled. When someone makes a move, all players are notified (`move_made` message), and should reply (within 1s) with whether they want to challenge that move or not (`move_reply` message). Message `round_end` announces loser of the current round, and `game_end` announces winner of the game. When server is about to close, it broadcasts `shutdown` message with optional reason why.\
Few thing to have in mind: MoveIDs reset on each round and PlayerIDs reset on each game. Turns go in circle in ascending order by PlayerID. If you make impossible bid you automatically lose the round.

You can also refer to message prototypes as typescript interfaces defined in file: [api.ts](./server/api.ts).

## Messages format

```typescript

type Face = 1 | 2 | 3 | 4 | 5 | 6;
type Bid = {
    value: Face | 0,
    count: number,
}
type Hand = Face[];
type PlayerID = number;
type MoveID = number;

interface welcome {
    subject: "welcome",
    status_message: "OK" | "lobby is full",
    number_of_dice: number,
    number_of_players: number,
    current_player_count: number,
}

interface game_start {
    subject: "game_start",
    number_of_dice: number,
    number_of_players: number,
    your_id: PlayerID,
}

interface game_end {
    subject: "game_end",
    winner: PlayerID,
}

interface round_start {
    subject: "round_start",
    state: [PlayerID, number][], // number of dice left to each player
    players_left: number, // number of players with non-zero dice
    your_hand: Hand,
    first_to_move: PlayerID,
}

interface round_end {
    subject: "round_end",
    loser: PlayerID,
}


interface move_made {
    subject: "move_made",
    move_id: MoveID,
    by_player: PlayerID,
    bid: Bid,
    next_to_move?: PlayerID,
}

interface move_reply {
    subject: "move_reply",
    my_id: PlayerID,
    move_id: MoveID,
    challenge: boolean,
}

interface your_turn {
    subject: "your_turn",
    last_move: MoveID,
    this_move: MoveID,
    currentBid: Bid,
}

interface my_move {
    subject: "my_move",
    my_id: PlayerID,
    move_id: MoveID,
    bid: Bid,
}

interface shutdown {
    subject: "shutdown",
    reason?: string,
}

```
