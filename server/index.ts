import { blue, yellow, green } from 'https://deno.land/std@0.198.0/fmt/colors.ts';

import { move_request, round_over, move_response, set_name, header } from './types.ts';
import Game from './game.ts';

type outbound = move_request;
type inbound = move_response;

const number_of_players = + (Deno.args[0] ?? 2);
const number_of_dice = + (Deno.args[1] ?? 6);
const number_of_games = + (Deno.args[2] ?? 1);
const port_number = + (Deno.args[3] ?? 5533);
export const logging = false;


export class Client {
    
    private readonly socket: Deno.Conn;
    public disconnected = false;
    public readonly ID: number;
    public name?: string;
    public victories: number;

    private map: Map<string, (value: inbound | PromiseLike<inbound>) => void>;

    constructor (socket: Deno.Conn, index: number) {
        this.socket = socket;
        this.ID = index;
        this.victories = 0;
        this.map = new Map();
    }

    public setName(name: string) {
        if (!this.name)
            this.name = name;
    }

    private async send(msg: string) {
        try {
            return await this.socket.write(new TextEncoder().encode(msg));
        } catch (_) {
            this.disconnected = true;
            return 0;
        }
    }

    public notify(msg: round_over) {
        if (!this.disconnected)
            this.send(JSON.stringify(msg));
    }

    public ask(msg: outbound): Promise<inbound> {

        if (this.disconnected)
            return new Promise((_, reject) => reject('disconnected'));

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

        if (!wrapped_msg.message_id || !wrapped_msg.move)
            return;

        const id = wrapped_msg.message_id;
        const msg: inbound = {move: wrapped_msg.move};

        const resolve = this.map.get(id);
        if (resolve) resolve(msg);

        this.map.delete(id);

    }

}

async function handle(conn: Deno.Conn) {

    const info = conn.remoteAddr as Deno.NetAddr;
    console.log(blue(`Player connected: ${info.hostname}:${info.port}`));

    const client = new Client(conn, clients.length);
    clients.push(client);
    console.log(blue(`Lobby: ${clients.length}/${number_of_players}.`));

    while (true) {

        const buffer: Uint8Array = new Uint8Array(200);
        const len = await conn.read(buffer);
        if (len === null) {
            client.disconnected = true;
            break;
        }
        const data: string = new TextDecoder().decode(buffer).slice(0, len);
        
        if (logging)
            Deno.writeTextFileSync('./logs/incoming.log', `${info.port}: ${data}\n`, {append: true});

        const msg: set_name | header & inbound = JSON.parse(data);
        if (!msg) return;

        // TODO: improve type guarding?

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
    }

}

async function playThemGames() {

    console.log(green('The match begins, good luck!'));

    for (let i = 1; i <= number_of_games; i++) {
        // await new Promise((resolve) => setTimeout(resolve, 200));
        const game = new Game(i, clients, number_of_dice);
        console.log(yellow('Game ' + i + ' begins!'));
        console.log(yellow(JSON.stringify(clients.map(client => client.name))));
        const winner_id: number = await game.play();
        const winner = clients[winner_id-1];
        winner.victories += 1;
        console.log(yellow('Game ' + i + ' ended, winner: ' + winner.name));
    }

    console.log(green('All games completed!'));

    console.log('Results:', clients.map(client => {return {name: client.name, victories: client.victories}}));

}

const server = Deno.listen({port: port_number});
const clients: Client[] = [];

const info = server.addr as Deno.NetAddr;
console.log(`Server is waiting for bots on ${info.hostname}:${info.port}`);
if (logging) Deno.writeTextFileSync('./logs/incoming.log', '');

while (clients.length < number_of_players) {
    const client = await server.accept();
    handle(client);
}
server.close();
playThemGames().then(() => {
    Deno.exit();
});

