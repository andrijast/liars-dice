const net = require('net')
// import net from 'node:net';
const fs = require('fs');

const debug = process.argv.length === 3;
const path = __dirname + '/log.txt';
if (debug) {
    fs.truncateSync(path, 0, () => {});
}

const client = net.createConnection({port: 5533})

client.on('connect', () => {
    client.write(JSON.stringify({
        name: `Igrac${Math.ceil(Math.random()*10)}`
    }) + '\n');
});

client.on('data', data => {

    // console.log(data.toString());

    const msgs = data.toString().split('\n').slice(0, -1);
    
    msgs.forEach(msg => process2(JSON.parse(msg)));

});

function process2(msg) {

    if (debug) {
        fs.appendFile(path, '-->' + JSON.stringify(msg) + '\n', () => {});
    }

    if (msg.subject === 'move_request') {
        const ret = answer(msg);
        if (debug) {
            fs.appendFile(path, '<--' + JSON.stringify(ret) + '\n', () => {});
        }
        client.write(JSON.stringify(ret) + '\n');
    }
}

function answer(msg) {
    
    const ret = {
        message_id: msg.message_id,
        move: 'pass',
    };

    if (msg.last_bid[0] > 0 && Math.random() < 0.2) {
        ret.move = 'challenge';
        return ret;
    }

    if (msg.other_hands[0][0] === 0) {
        ret.move = msg.last_bid;
        if (ret.move[0] === 0) ret.move[0]++;
        ret.move[1]++;
        return ret;
    }

    return ret;

}

function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

