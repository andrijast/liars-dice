
import { Face, Hand, Bid, outbound, inbound, EmptyBid } from './types.ts';
import { Client } from './index.ts';

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

    public getClient() {
        return this.client;
    }
    public ID() {
        return this.client.ID + 1;
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

    private last_loser = -1;
    private last_challenger = -1;

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
        
    }

    private getOutbound(): outbound {
        return {
            game_number: this.game_number,
            round_number: this.round_number,
            move_number: this.move_number,
            your_hand: [],
            other_hands: this.turn.map(i => [this.players[i].ID(), this.players[i].diceLeft]),
            last_move: "first_move",
            last_bid: [0, 0],
            last_bidder: this.turn[this.turn.length-1],
            last_loser: this.last_loser,
            last_challenger: this.last_challenger,
        }
    }

    private checkValidity(bid: MyBid): boolean {

        const hands: Hand[] = this.players.map(player => player.hand ?? []); // TODO: empty hand?

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

        while (this.players.length > 1) {

            this.round_number++;
            console.log('before round', this.round_number);

            const loser_index = await this.playRound();
            const loser = this.players[loser_index];
            console.log('round', this.round_number, 'loser is', loser.getClient().name);
            this.last_loser = loser.ID();

            this.rotateTurn(loser_index);

            loser.diceLeft -= 1;
            if (loser.diceLeft == 0) {
                this.players.splice(loser_index, 1);
                this.turn.splice(this.turn.indexOf(loser_index), 1);
            }

            console.log('after round', this.round_number);

        }
    
        const winner = this.players[0].getClient();

        return winner;

    }


    async playRound() {

        const bid: MyBid = new MyBid(0, 0);
        
        for (const player of this.players) {
            player.buildHand();
        }
    
        while (true) {
            
            const msgs: outbound[] = [];
            for (let i = 0; i < this.players.length; i++) {
                const msg: outbound = this.getOutbound();
                msg.last_move = bid.value === 0? (this.last_challenger === 0? 'invalid_move' : 'challenge_made') : 'bid_made';
                msg.your_hand = this.players[i].hand ?? []; // TODO: should have it
                msg.other_hands[this.turn[i]][0] = 0;
                msg.last_bid = bid.toJSON();
                msgs.push(msg);
            }
    
            const replies = await Promise.allSettled(this.players.map((player, i) => player.ask(msgs[i])));
            console.log(replies);

            // check for invalid moves and timeouts
            for (const i of this.turn) {
                if (replies[i].status === 'rejected') {
                    this.last_challenger = 0;
                    return i;
                }
            }

            const replyMessages: inbound[] = replies.map(reply => (reply as PromiseFulfilledResult<inbound>).value);

            // check for the challenger
            for (const i of this.turn) {
                if (replyMessages[i].move === 'challenge') {
                    this.last_challenger = this.players[i].ID();
                    if (this.checkValidity(bid)) {
                        return this.turn[i];
                    } else {
                        return this.turn[this.turn.length-1];
                    }
                }
            }

            // otherwise: continue
            const nextBid: Bid = replyMessages[this.turn[0]].move as Bid; // TODO: type guard
            if (!bid.increase(...nextBid)) {
                return this.turn[0];
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
