
import { message } from "./api.ts";
import { MoveID, PlayerID } from "./game.ts";


export type Event = 
    {which: 'move', move: MoveID, by: PlayerID}
  | {which: 'reply', move: MoveID}

export interface Return {
    msgs: message[];
    count?: number;
    resolution?: (value: message[] | PromiseLike<message[]>) => void;
}


export default class Events {

    static _map: Map<string, Return> = new Map();
    static map = {
        get(key: Event): Return | undefined {
            return Events._map.get(JSON.stringify(key));
        },
        set(key: Event, value: Return) {
            Events._map.set(JSON.stringify(key), value);
        },
        delete(key: Event) {
            Events._map.delete(JSON.stringify(key));
        }
    }

    static emit(event: Event, msg: message) {

        const val = this.map.get(event) ?? { msgs: [] };
        const arr = val.msgs;
        arr.push(msg);
        
        this.map.set(event, val);

        if (val.count && val.resolution) {
            if (arr.length === val.count) {
                val.resolution(arr);
                this.map.delete(event);
            }
        }

        // console.log('emitted', this._map);

    }

    static async wait(event: Event, count: number) {

        // console.log('waiting...', event);

        let resolution;
        const promise = new Promise<message[]>((resolve) => {
            resolution = resolve;
        });

        const val = this.map.get(event) ?? {
            msgs: [],
            count,
            resolution,
        };

        const newval = {
            ...val,
            count,
            resolution,
        };
        this.map.set(event, newval);

        if (val.msgs.length === count)
            return val.msgs;

        return await promise;
    }

}

