
import { Face, Hand, Bid, EmptyBid } from './types.ts';
import { move_request, round_over, move_response } from './types.ts';
import { Client } from './index.ts';

type outbound = move_request;
type inbound = move_response;

class Player {

    public hand?: Hand;

    constructor (
        private client: Client,
        public index: number,
        public diceLeft: number,
    ) {}

    public ask(msg: outbound) {
        return this.client.ask(msg);
    }
    public notify(msg: round_over) {
        this.client.notify(msg);
    }

    public ID() {
        return this.client.ID + 1;
    }
    public name() {
        return this.client.name;
    }

    public buildHand() {
        const ret : Hand = [];
        for (let i = 0; i < this.diceLeft; i++) {
            const val = Math.ceil(Math.random() * 6);
            ret.push(val as Face); // TODO: is this typesafe?
        }
        ret.sort();
        this.hand = ret;
    }

}

class MyBid {
    constructor(public value: number, public count: number) {}
    toJSON(): Bid | EmptyBid {
        return [this.value as Face, this.count];
    }
    increase(value: number, count: number): boolean {
        if (!(count >= this.count && count > 0
            && (count > this.count
            || value > this.value)))
                return false;
        this.count = count;
        this.value = value;
        return true;
    }
}

export default class Game {

    public readonly game_number: number;
    public round_number: number;
    public move_number: number;

    private players: Player[];
    private turn: number[];

    constructor(game_number: number, clients: Client[], number_of_dice: number) {

        this.game_number = game_number;
        this.round_number = 0;
        this.move_number = 0;

        this.players = new Array<Player>(clients.length);
        this.turn = [...Array(this.players.length).keys()];

        const perm = generateRandomPermutation(clients.length);

        for (const i in clients) {
            const player = new Player(clients[i], perm[i], number_of_dice);
            this.players[perm[i]] = player;
        }

        // Deno.writeTextFileSync(`${Deno.cwd()}/log.txt`, '');
        
    }

    private checkValidity(bid: MyBid): boolean {
        const hands: Hand[] = this.turn.map(i => this.players[i].hand ?? []); // TODO: empty hand?
        const value = bid.value;
        let count = 0;
        for (const hand of hands) {
            count += hand.reduce((sum: number, cur: number) => sum + +(cur === value), 0);
        }
        return count >= bid.count;
    }

    private rotateTurn(ind: null | number) {
        if (!ind) {
            this.turn.push(this.turn.shift() ?? 0); // TODO: 0 should not happpen
        }
        else while (this.turn[0] !== ind) {
            this.turn.push(this.turn.shift() ?? 0); // TODO: 0 should not happpen
        }
    }

    async play() {

        while (this.turn.length > 1) {

            this.round_number++;
            console.log('Round', this.round_number, 'starts!');

            const [ loser_index, challenger_index ] = await this.playRound();
            const loser = this.players[loser_index];
            const challenger = challenger_index === -1 ? undefined : this.players[challenger_index];

            this.rotateTurn(loser_index);
            loser.diceLeft -= 1;
            if (loser.diceLeft == 0) {
                this.turn.splice(this.turn.indexOf(loser_index), 1);
            }

            const msg: round_over = {
                subject: 'round_over',
                game_number: this.game_number,
                round_number: this.round_number,
                state: this.players.map(player => [player.ID(), player.diceLeft]),
                round_loser: loser.ID(),
                round_challenger: challenger?.ID() ?? 0,
                game_winner: this.turn.length == 1 ? this.players[this.turn[0]].ID() : 0,
            };
            for (const player of this.players) {
                player.notify(msg);
            }

            console.log('Round', this.round_number, 'ends, loser:', loser.name());

        }
    
        return this.players[this.turn[0]].ID();

    }


    async playRound() {

        this.move_number = 0;
        const bid: MyBid = new MyBid(0, 0);
        for (const i of this.turn) {
            this.players[this.turn[i]].buildHand();
        }
    
        while (true) {

            this.move_number++;
            
            const msgs: outbound[] = [];
            for (const ti of this.turn) {
                const player = this.players[ti];
                const msg: move_request = {
                    subject: 'move_request',
                    game_number: this.game_number,
                    round_number: this.round_number,
                    move_number: this.move_number,
                    your_hand: player.hand ?? [], // TODO: should not be []
                    other_hands: this.turn.map(i => [
                        this.players[i].ID() == player.ID() ? 0 : this.players[i].ID(),
                        this.players[i].diceLeft]),
                    last_bid: bid.toJSON(),
                }
                msgs.push(msg);
            }
    
            const replies = await Promise.allSettled(
                this.turn.map((ti, i) => this.players[ti].ask(msgs[i]))
            );

            // console.log(replies);
            // await Deno.writeTextFile('./log.txt', JSON.stringify(replies) + '\n', {append: true});

            // check for invalid moves and timeouts
            for (const [i, ti] of this.turn.entries()) {
                if (replies[i].status === 'rejected') {
                    return [ti, -1];
                }
            }

            const replyMessages: inbound[] = replies.map(
                reply => (reply as PromiseFulfilledResult<inbound>).value
            );
            // console.log(replyMessages);

            // check for the challenger
            for (const [i, ti] of this.turn.entries()) {
                if (replyMessages[i].move === 'challenge') {
                    if (this.checkValidity(bid)) {
                        return [ti, ti];
                    } else {
                        return [this.turn[this.turn.length-1], ti];
                    }
                }
            }

            // otherwise: continue
            const nextBid = replyMessages[0].move;
            if (!(nextBid !== 'challenge' && nextBid !== 'pass' && bid.increase(...nextBid))) {
                return [this.turn[0], -1];
            }
            this.rotateTurn(null);

        }

    }

}


// ----- UTILS -----

function generateRandomPermutation(n: number): number[] { // by ChatGipity
    const permutation = Array.from({ length: n }, (_, index) => index);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    return permutation;
}

function _sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
