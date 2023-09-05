import net from 'node:net';
// import * as net from "https://deno.land/std@0.110.0/node/net.ts";
import { red, blue, yellow, green } from 'https://deno.land/std@0.198.0/fmt/colors.ts';

import { move_request, round_over, move_response, set_name, header } from './types.ts';
import Game from './game.ts';

type outbound = move_request;
type inbound = move_response;

const number_of_players = + (Deno.args[0] ?? 2);
const number_of_dice = + (Deno.args[1] ?? 6);
const number_of_games = + (Deno.args[2] ?? 1);
const port_number = + (Deno.args[3] ?? 5533);


export class Client {
    
    private readonly socket: net.Socket;
    public readonly ID: number;
    public name?: string;
    public victories: number;

    private map: Map<string, (value: inbound | PromiseLike<inbound>) => void>;

    constructor (socket: net.Socket, index: number) {
        this.socket = socket;
        this.ID = index;
        this.victories = 0;
        this.map = new Map();
    }

    public setName(name: string) {
        if (!this.name)
            this.name = name;
    }

    private send(msg: string) {
        return this.socket.write(msg);
    }

    public notify(msg: round_over) {
        return this.send(JSON.stringify(msg));
    }

    public ask(msg: outbound): Promise<inbound> {

        const id = Math.random().toString(36).substring(2);
        const wrapped_msg: header & outbound = {
            message_id: id,
            ...msg,
        }

        const ret: Promise<inbound> = new Promise((resolve, reject) => {

            this.map.set(id, resolve);

            this.send(JSON.stringify(wrapped_msg));

            setTimeout(() => reject('timeout'), 3000);

        });

        return ret;
    }

    public answer(wrapped_msg: header & inbound) {

        // console.log(wrapped_msg);
        if (!wrapped_msg.message_id || !wrapped_msg.move) return;

        const id = wrapped_msg.message_id;
        const msg: inbound = {move: wrapped_msg.move};

        const resolve = this.map.get(id);
        if (resolve) resolve(msg);

        this.map.delete(id);

    }

}

const clients: Client[] = [];


const handler = (conn: net.Socket) => {
    conn.setEncoding('utf8');

    console.log(blue(`Player connected: ${conn.remoteAddress}:${conn.remotePort}`));

    if (clients.length >= number_of_players) {
        conn.write("Server is full.");
        conn.destroy();
        return;
    }

    const client = new Client(conn, clients.length);
    clients.push(client);
    console.log(blue(`Lobby: ${clients.length}/${number_of_players}.`));

    if (clients.length === number_of_players) {
        playThemGames().then(() => {
            server.close();
            Deno.exit();
        });
    }

    conn.on('data', (data: string) => {

        // console.log('-->', data, '\n');

        const msg: set_name | header & inbound = JSON.parse(data);
        // console.log(conn.remotePort, msg);
        if (!msg) return;

        if ('name' in msg) {
            if (typeof msg.name === 'string')
                client.setName(msg.name);
        }

        if ('message_id' in msg && 'move' in msg) {
            if (typeof msg.message_id === 'string' && (typeof msg.move === 'string' || 
                Array.isArray(msg.move) && msg.move.length === 2 && typeof msg.move[0] === 'number' && typeof msg.move[1] === 'number'
            ))
                client.answer(msg);
        }

        // TODO: improve type guarding?

    });

    conn.on('end', () => {
        console.log(red(`Player disconnected: ${conn.remoteAddress}:${conn.remotePort}.`));
        // TODO: handle peacefully
        server.close();
        Deno.exit();
    });

}


const server = net.createServer(handler);

server.listen(port_number);

const info: net.AddressInfo = server.address() as net.AddressInfo;
console.log(`Server is listening for bots on ${info.address}:${info.port}`);


async function playThemGames() {

    console.log(green('The match begins, good luck!'));

    for (let i = 1; i <= number_of_games; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const game = new Game(i, clients, number_of_dice);
        console.log(yellow('Game ' + i + ' begins!'));
        console.log(yellow(JSON.stringify(clients.map(client => client.name))));
        const winner_id: number = await game.play();
        const winner = clients[winner_id-1];
        winner.victories += 1;
        console.log(yellow('Game ' + i + ' ended, winner: ' + winner.name));
    }

    console.log(green('All games completed!'));

}

