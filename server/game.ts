
import * as api from './api.ts'

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

export type Bid = {
    value: Face | 0,
    count: number,
}

export type Hand = Face[];

export type PlayerID = number;
export type MoveID = number;


export function generateStartingHand(count: number): Hand {

    const ret : Hand = [];

    for (let i = 0; i < count; i++) {
        const val = Math.ceil(Math.random() * 6);
        ret.push(val as Face); // TODO: is this typesafe?
    }

    ret.sort();
    return ret;

}

export function checkValidity(bid: Bid, hands: Hand[]): boolean {

    const val = bid.value;
    let count = 0;

    for (const hand of hands) {
        count += hand.reduce((sum, cur) => sum + +(cur === val), 0);
    }

    return count >= bid.count;
    
}

export function checkNextBid(curr: Bid, next: Bid): boolean {

    return next.count >= curr.count
        && (next.count > curr.count
        || next.value > curr.value);

}


export function findChallenger(msgs: api.move_reply[], from: PlayerID): PlayerID | undefined {

    msgs.sort((a, b) => a.my_id - b.my_id);
    const n = msgs.length;
    for (let i = 1; i < n; i++) {
        const ind = (from + i) % n;
        if (msgs[ind].challenge)
            return msgs[ind].my_id;
    }

}
