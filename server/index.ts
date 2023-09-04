import net from 'node:net';
// import * as net from "https://deno.land/std@0.110.0/node/net.ts";
import { red, blue, yellow, green } from 'https://deno.land/std@0.198.0/fmt/colors.ts';

import { inbound, inbound_packet, outbound, outbound_packet } from './types.ts';
import Game from './game.ts';


const number_of_players = + (Deno.args[0] ?? 2);
const number_of_dice = + (Deno.args[1] ?? 6);
const number_of_games = + (Deno.args[2] ?? 1);
const port_number = + (Deno.args[3] ?? 5533);


export class Client {
    
    private readonly socket: net.Socket;
    public readonly ID: number;
    public name?: string;
    public victories: number;

    private map: Map<string, (value: inbound | PromiseLike<inbound>) => void> = new Map();

    constructor (socket: net.Socket, index: number) {
        this.socket = socket;
        this.ID = index;
        this.victories = 0;
    }

    public setName(name: string) {
        this.name = name;
    }

    public won() {
        this.victories++;
    }

    private send(msg: string) {
        return this.socket.write(msg);
    }

    public ask(msg: outbound): Promise<inbound> {

        const id = Math.random().toString(36).substring(2);
        const wrapped_msg: outbound_packet = {
            ...msg,
            message_id: id,
        }

        this.send(JSON.stringify(wrapped_msg));

        const ret: Promise<inbound> = new Promise((resolve, reject) => {

            this.map.set(id, resolve);

            setTimeout(() => reject('timeout'), 3000);

        });

        return ret;
    }

    public answer(msg_string: string) {

        const msg_packet: inbound_packet = JSON.parse(msg_string);
        // TODO: type guard
        const id = msg_packet.message_id;
        // TODO: type narrowing
        const msg_plain: inbound = msg_packet;

        const resolve = this.map.get(id);

        if (resolve) resolve(msg_plain);

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
    console.log(blue(`Lobby: ${clients.length}/${number_of_players}`));

    if (clients.length === number_of_players) {
        playThemGames().then(() => {
            server.close();
            Deno.exit();
        });
    }

    conn.on('data', (data: string) => {

        // console.log('-->', data, '\n');

        client.answer(data);

    });

    conn.on('end', () => {
        console.log(red(`Player disconnected: ${conn.remoteAddress}:${conn.remotePort}`));
        // TODO: handle peacefully
        server.close();
        Deno.exit();
    });

}


const server = net.createServer(handler);

server.listen(port_number);


async function playThemGames() {

    console.log(green('The match begins, good luck!'));

    for (let i = 0; i < number_of_games; i++) {
        const game = new Game(i, clients, number_of_dice);
        console.log(yellow('Game ' + i + ' begins!'));
        const winner: Client = await game.play();
        winner.won();
        console.log(yellow('Game ' + i + ' ended, winner: ' + winner.name));
    }

    console.log(green('All games completed!'));

}

