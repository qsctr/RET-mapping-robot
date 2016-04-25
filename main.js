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

    let arduino = new Board(port.comName);

    arduino.on('ready', () => {

        console.log('Arduino connected');
        console.log('Setting up robot...');

        let ledPin = 13;
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

            io.on('start', () => {
                console.log('Robot started');
                startRobot();
            });
            io.on('stop', () => {
                console.log('Robot stopped');
                stopRobot();
            });
            io.on('reset', () => {
                console.log('Robot resetted');
                setupRobot();
            })
            io.on('end', () => {
                console.log('Server stopped');
                endProgram();
            });

            function endProgram() {
                server.close();
                rl.close();
                process.exit();
            }

        });

        app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

        io.on('connection', socket => socket.emit('message', 'Connected'));

        function message(m) {
            io.emit('message', m);
        }

        function setupRobot() {
            arduino.pinMode(ledPin, board.MODES.OUTPUT);
        }

        function startRobot() {
            arduino.digitalWrite(ledPin, 1);
        }

        function stopRobot() {
            arduino.digitalWrite(ledPin, 0);
        }

    });
});
