// This program both controls the robot and starts a server.
// You can access the server at localhost:4000/ to view the
// data sent from the robot. So far there is only ping info,
// but in the final product there will be the map that the
// robot creates. Right now, the robot does not move by
// itself because some ping sensors are broken.

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

    // for some reason, the automatic port choosing broke,
    // so this is just a temporary workaround
    port = {
        comName: 'COM28'
    };

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
        }; // breadboard is front

        function writeToMotors(obj) {
            for (let motor in obj) {
                if (obj.hasOwnProperty(motor)) {
                    arduino.servoWrite(motors[motor], obj[motor]);
                }
            }
        }

        // in clockwise order from the front (like a clock)
        const pings = [44, 38, 48, 36, 42, 46, 52, 50];

        const fwSpeed = 180;
        const bwSpeed = 0;
        const stopSpeed = 90;

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
                // These are just for testing of the robot.
                // In the final product the robot would be
                // autonomous, and there would only be start,
                // stop, and end.
                switch (cmd) {
                    case 'start':
                        message('Robot started');
                        startRobot();
                        break;
                    case 'w':
                        forward();
                        break;
                    case 's':
                        backward();
                        break;
                    case 'a':
                        left();
                        break;
                    case 'd':
                        right();
                        break;
                    case ' ':
                        message('Robot stopped');
                        stopRobot();
                        break;
                    case 'reset':
                        message('Robot resetted');
                        setupRobot();
                        break;
                    case 'end':
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

        app.get('/', (req, res) =>
            res.sendFile(__dirname + '/index.html'));

        io.on('connection', socket =>
            socket.emit('message', 'Connected to server'));

        function message(m) {
            io.emit('message', m);
        }

        function setupRobot() {
            loopValues(motors, pin =>
                arduino.servoConfig(pin, 1000, 2000));
        }

        function startRobot() {

            let recent = new Array(8);

            pingInterval = setInterval(() => {
                if (recent.every(x => x !== undefined)) {
                    io.emit('ping', recent);
                }
            }, 500);

            let one = false;

            let now = [0, 4];

            // the pings have to alternate, or else they will read
            // each other's signals.
            function readOppo() {
                console.log('pinging ' + now);
                now.forEach(i => arduino.pingRead({
                    pin: pings[i],
                    value: 1,
                    pulseOut: 5
                }, ms => {
                    recent[i] = {
                        cm: Math.round(ms / 29 / 2),
                        pin: pings[i]
                    };
                    if (one) {
                        if (now[0] === 3) {
                            now[0] = 0;
                            now[1] = 4;
                        } else {
                            now[0]++;
                            now[1]++;
                        }
                        setTimeout(readOppo, 500);
                        one = false;
                    } else {
                        one = true;
                    }
                }));
            }

            readOppo();
        }

        function forward() {
            writeToMotors({
                fl: 130,
                fr: 55,
                bl: 140,
                br: 40
            });
        }

        function backward() {
            writeToMotors({
                fl: 50,
                fr: 125,
                bl: 40,
                br: 140
            });
        }

        function left() {
            writeToMotors({
                fl: 50,
                fr: 125,
                bl: 140,
                br: 40
            });
        }

        function right() {
            writeToMotors({
                fl: 130,
                fr: 55,
                bl: 40,
                br: 140
            });
        }

        function stopRobot() {
            clearInterval(pingInterval);
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
