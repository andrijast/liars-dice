const net = require('net')
// import net from 'node:net';

const client = net.createConnection({port: 5533})

client.on('connect', () => {
    
});

client.on('data', data => {

    console.log('--> begin');
    console.log(data.toString());
    console.log('--> end');

    const msg = JSON.parse(data.toString());

    const ret = answer(msg);

    client.write(JSON.stringify(ret));

});


function answer(msg) {
    
    const ret = {
        message_id: msg.message_id,
        move: 'pass',
    };

    if (Math.random() < 0.2) {
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

