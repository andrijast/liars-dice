
Communication between server and an AI bot is done via TCP/IP sockets with messages in JSON format. Therefore, you can write your bot in any language that supports these two.

Message passing is done in a request-response manner, meaning, after server sends a message, bot should reply synchronously with the same `message_id` field. This is the only means of communication.

Here's the JSON structure of messages passed: (in typescript)

```typescript
// ancillary types
type Ordinal = number; // integer starting from 1
type PlayerID = number;
type DiceCount = number;
type Bid = [number, number]; // [value, count]

// from server to bots
export interface outbound {
    message_id: number;
    your_id: PlayerID | null; // on initial exchange
    game_number: Ordinal;
    round_number: Ordinal;
    move_number: Ordinal;
    state: [PlayerID, DiceCount][]; // player id with dice left in the hand sorted by playing order
    currentBid: Bid; // first move if [0,0]
    last_round: {
        loser: PlayerID | null; // null if first round of the game
        challenger: PlayerID | null; // null if lost by invalid move
    }
}

// from bot to server
export interface inbound {
    message_id: number;
    name?: string; // on initial exchange
    challenge?: boolean; // after each move
    move?: Bid; // when it's your turn
}
```


Key takeaways:

- Communication is *synchronous*. Server waits for all to reply, and then evaluates answers.
- Round-robin principle. If multiple players challenge or send invalid messages (including timed-out message), next player's in playing order message will be acknowledged.
- Property `state` contains information about all players left in the game. It is an array of pairs of player's ID and how much dice they have left, sorted by playing order.
- It's your turn if you're first in the `state` array. Otherwise, `move` you send won't be taken into account.
- On initial message, server sends you your ID and you should respond with your name. On other moves `your_id` will have null value, so name you send won't be taken into account.
