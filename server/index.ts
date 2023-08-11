import net from 'node:net';
// import * as net from "https://deno.land/std@0.110.0/node/net.ts";

import * as api from './api.ts';
import { generateStartingHand, checkValidity, checkNextBid, PlayerID, Hand, Bid, findChallenger } from './game.ts';
// import * as game from './game.ts'

import { red, blue, yellow, green } from 'https://deno.land/std@0.198.0/fmt/colors.ts';

import Events from './even.ts';

const number_of_players = + (Deno.args[0] ?? 2);
const number_of_dice = + (Deno.args[1] ?? 6);
const number_of_games = + (Deno.args[2] ?? 1);
const port = + (Deno.args[3] ?? 5533);


class Client {
    
    public readonly socket: net.Socket;
    public readonly index: number;
    public name: string;
    public victories: number;

    constructor (socket: net.Socket, index: number) {
        this.socket = socket;
        this.index = index;
        this.name = 'undefined';
        this.victories = 0;
    }

    public send(msg: string) {
        return this.socket.write(msg);
    }

}

// const clients: Client[] = new Array<Client>(number_of_players);
const clients: Client[] = [];


const handler = (conn: net.Socket) => {
    conn.setEncoding('utf8');

    console.log(blue('new player joined the lobby'), conn.remotePort);
    const id = clients.length;

    if (clients.length < number_of_players) {
        clients.push(new Client(conn, id));
        const msg: api.welcome = {
            subject: 'welcome',
            status_message: 'OK',
            number_of_dice,
            number_of_players,
            current_player_count: clients.length,
        };
        conn.write(JSON.stringify(msg));
        if (clients.length === number_of_players) {
            matchFlow();
        }
    } else {
        const msg: api.welcome = {
            subject: 'welcome',
            status_message: 'lobby is full',
            number_of_dice,
            number_of_players,
            current_player_count: clients.length,
        };
        conn.write(JSON.stringify(msg));
        return;
    }

    conn.on('data', async (data: string) => {
        console.log('-->', data, '\n');
        const msg = JSON.parse(data);

        switch (msg.subject) {
            case 'move_reply': {
                Events.emit({which: 'reply', move: (msg as api.move_reply).move_id}, msg);
                break;
            }
            case 'my_move': {
                Events.emit({which: 'move', move: (msg as api.my_move).move_id, by: id}, msg);
                break;
            }
            default: {
                console.log('Bad message arrived from', conn.remotePort);
                break;
            }
        }

        await sleep(100);

    });

    conn.on('end', () => {
        console.log(red('player disconnected'), conn.remotePort);
        const msg: api.shutdown = {
            subject: 'shutdown',
            reason: 'Player disconnected...',
        };
        broadcast(msg);
        server.close();
        Deno.exit();
    });

}


const server = net.createServer(handler)
server.listen(port);



// ----- FLOWS -----

class Player {

    public hand?: Hand;

    constructor (
        public clientIndex: number,
        public id: PlayerID,
        public diceLeft: number,
    ) {}

    public async send(msg: api.message) {
        await sleep(100);
        return clients[this.clientIndex].send(JSON.stringify(msg));
    }

}

interface GameState {
    num: number,
    players: Player[],
    playersLeft: number,
    nextToMove: number,
}

async function matchFlow() {

    console.log(green('match begins, good luck'));

    for (let i = 0; i < number_of_games; i++) {
        await gameFlow(i);
    }

    console.log(green('all games completed'));
    const msg: api.shutdown = {
        subject: 'shutdown',
        reason: 'All games completed',
    };
    broadcast(msg);
    server.close();
    Deno.exit();

}

async function gameFlow(num: number) {

    console.log(yellow('game ' + num + ' begins!'));

    const perm = generateRandomPermutation(number_of_players);

    const players: Player[] = new Array<Player>(number_of_players);

    for (const i in clients) {
        const player = new Player(+i, perm[i], number_of_dice);
        players[perm[i]] = player;

        const msg: api.game_start = {
            subject: 'game_start',
            number_of_dice,
            number_of_players,
            your_id: perm[i],
        }

        await player.send(msg);

    }

    const state: GameState = {
        num,
        players: players,
        playersLeft: players.length,
        nextToMove: 0,
    }

    let rnd = 0;
    while (state.playersLeft > 1) {
        // console.log('before round', ++rnd, state);
        await roundFlow(state); // be wary, it can change there
        // console.log('after round', rnd, state);
    }

    const winner = nextPlayer(state.players, 0);

    const msg_end: api.game_end = {
        subject: 'game_end',
        winner: winner ?? -1,
    };
    broadcast(msg_end);

    if (winner)
        clients[state.players[winner].clientIndex].victories++;

    console.log(yellow('game ' + num + ' ended, winner: ' + winner));

    
}


async function roundFlow(state: GameState) {

    const players = state.players;
    const stateAPI: [number, number][] = players.map(player => [player.id, player.diceLeft]);
    let bid: Bid = { value: 0, count: 0 };
    let turn = state.nextToMove;
    let move = 0;
    
    // console.log(players);
    for (const player of players) {
        const hand = generateStartingHand(number_of_dice);
        const msg: api.round_start = {
            subject: 'round_start',
            state: stateAPI,
            players_left: state.playersLeft,
            first_to_move: turn,
            your_hand: hand,
        }
        player.hand = hand;
        await player.send(msg);
    }

    let loser = -1;

    while (true) {
        
        const msg_yt: api.your_turn = {
            subject: 'your_turn',
            last_move: move,
            this_move: ++move,
            currentBid: bid,
        }
        await players[turn].send(msg_yt);

        const reply = (await Events.wait({which: 'move', move, by: players[turn].clientIndex}, 1))[0] as api.my_move;

        if (checkNextBid(bid, reply.bid)) {
            bid = reply.bid;
        } else {
            loser = turn;
            break;
        }

        const msg_mm: api.move_made = {
            subject: 'move_made',
            move_id: move,
            by_player: turn,
            bid,
        }
        broadcast(msg_mm);

        const replies = await Events.wait({which: 'reply', move}, state.playersLeft) as api.move_reply[];

        const chl = findChallenger(replies, turn);
        if (chl) {
            if (checkValidity(bid, state.players.map(player => player.hand ?? []))) {
                loser = chl;
            } else {
                loser = turn;
            }
            break;
        }

        turn = nextPlayer(state.players, turn) ?? -1; // TODO: wtf with -1?

    }

    if (--state.players[loser].diceLeft === 0) {
        state.playersLeft--;
        state.nextToMove = nextPlayer(state.players, loser) ?? -1;
    } else {
        state.nextToMove = loser;
    }

    const msg: api.round_end = {
        subject: 'round_end',
        loser,
    }
    broadcast(msg);

}


// ----- UTILS -----

function nextPlayer(players: Player[], from: number): PlayerID | undefined {
    const n = players.length;
    for (let i = 1; i <= n; i++) {
        const player = players[(from + i) % n];
        if (player.diceLeft > 0)
            return player.id;
    }
}

function broadcast(msg: api.broadcast) {
    for (const client of clients) {
        client.socket.write(JSON.stringify(msg));
    }
}

function generateRandomPermutation(n: number): number[] { // by ChatGipity
    const permutation = Array.from({ length: n }, (_, index) => index);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    return permutation;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

