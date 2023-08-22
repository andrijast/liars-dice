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
        name: "Joca",
        challenge: false,
        move: msg.currentBid,
    };

    if (Math.random() < 0.2) {
        ret.challenge = true;
        return ret;
    }

    if (msg.is_your_turn) {
        ret.move.count++;
        return ret;
    }

}

