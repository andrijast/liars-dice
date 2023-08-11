const net = require('net')
// import net from 'node:net';

const client = net.createConnection({port: 5533})

let id = -1;

client.on('connect', () => {
    
})

client.on('data', async data => {

    console.log('--> begin');
    console.log(data.toString());
    console.log('--> end');
    const msg = JSON.parse(data.toString());
    // console.log(msg);

    switch (msg.subject) {
        case 'game_start': {
            id = msg.your_id;
            break;
        }
        case 'move_made': {
            if (id) await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Do you challenge or not?');
            client.write(JSON.stringify({
                subject: 'move_reply',
                my_id: id,
                move_id: msg.move_id,
                challenge: Math.random() < 0.2,
            }));
            break;
        }
        case 'your_turn': {
            console.log('Its your turn champ!');
            msg.currentBid.count++;
            client.write(JSON.stringify({
                subject: 'my_move',
                my_id: id,
                move_id: msg.this_move,
                bid: msg.currentBid,
            }));
            break;
        }
    }

})

