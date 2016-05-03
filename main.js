'use strict';

const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});
const Board = require('firmata');

console.log('Finding port...');

Board.requestPort((err, port) => {

    if (err) {
        console.log(err);
        return;
    }

    console.log('Port found: ' + port.comName);
    console.log('Connecting to Arduino...');

    const arduino = new Board(port.comName);

    arduino.on('ready', () => {

        console.log('Arduino connected');
        console.log('Setting up robot...');

        const motors = {
            fl: 3,
            fr: 4,
            bl: 5,
            br: 6
        };
        const pingPin = 7;
        let pingInterval;

        setupRobot();

        console.log('Finished setting up robot');
        console.log('Starting server...');

        const app = require('express')();
        const server = require('http').createServer(app);
        const io = require('socket.io')(server);

        server.listen(4000, () => {

            console.log('server started on port 4000');
            console.log('type "start" to start robot,');
            console.log('"stop" to stop robot,');
            console.log('"reset" to reset robot,');
            console.log('"end" to stop server and robot');

            rl.on('line', cmd => {
                if (cmd === 'start') {
                    message('Robot started');
                    startRobot();
                } else if (cmd === 'stop') {
                    message('Robot stopped');
                    stopRobot();
                } else if (cmd === 'reset') {
                    message('Robot resetted');
                    setupRobot();
                } else if (cmd === 'end') {
                    message('Server stopped');
                    endProgram();
                }
            });

            function endProgram() {
                stopRobot();
                server.close();
                rl.close();
                process.exit();
            }

        });

        app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

        io.on('connection', socket => socket.emit('message', 'Connected to server'));

        function message(m) {
            io.emit('message', m);
        }

        function setupRobot() {
            loopValues(motors, pin => arduino.servoConfig(pin, 1000, 2000));
        }

        function startRobot() {
            // pingInterval = setInterval(() => arduino.pingRead({
            //     pin: pingPin,
            //     value: 1,
            //     pulseOut: 5
            // }, ms => io.emit('ping', Math.round(ms / 29 / 2))), 500);
            loopValues(motors, pin => {
                arduino.servoWrite(pin, 0);
            });
        }

        function stopRobot() {
            // clearInterval(pingInterval);
            loopValues(motors, pin => arduino.servoWrite(pin, 90));
        }

    });
});

function loopValues(obj, fn) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            fn(obj[key]);
        }
    }
}
