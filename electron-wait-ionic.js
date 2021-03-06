const path      = require('path')          ;
const net       = require('net')           ;
const colors    = require('colors')        ;
const moment    = require('moment')        ;
const timer     = require('moment-timer')  ;
const process   = require('process')       ;
const childproc = require('child_process') ;
const fs        = require('graceful-fs')   ;
// const exec = childproc.exec;
// let secondsToWait = 180;
// let secondsToWait = 0;
// let startAttempts = 0;
let port = 8110;
let url = `http://localhost:${port}`;

process.env.E_URL = url;

var startedElectron = false;
let startAttempts = 0;
let electronProcess;
let ionicServeProcess;
var homedir = __dirname;
var timeoutHandle;
var timeoutHandles  = [];
let ionicServePath  = path.join(__dirname, 'node_modules', '@ionic', 'app-scripts', 'bin', 'ionic-app-scripts.js');
let electronCLIPath = path.join(__dirname, 'node_modules', 'electron', 'cli.js');

const startIonicServe = function() {
  console.log(`IonitronDev: Starting Ionic Serve ...`.bgGreen.white.bold);
  // ionicServeProcess = childproc.spawn('cmd.exe', ['/k', 'npm', 'run', 'start'], {stdio: 'inherit'});
  ionicServeProcess = childproc.spawn('node', [ionicServePath, 'serve', '-p', '8110', '-r', '35739', '--dev-logger-port', '53713', '--nobrowser'], {stdio: 'inherit', env: process.env});
  // ionicServeProcess = childproc.fork('node', [ionicServePath, 'serve', '-p', '8110', '-r', '35739', '--dev-logger-port', '53713', '--nobrowser'], {stdio: 'inherit'});
  ionicServeProcess.on('close', () => {
    console.log(`IonitronDev: Ionic Serve process got 'close' event, killing Electron if runing …`);
    // if(electronProcess && typeof electronProcess.kill != undefined) {
    if(electronProcess && typeof electronProcess.send != undefined) {
      electronProcess.send("SIGINT");
      // electronProcess.kill("SIGINT");
    }
    if(timeoutHandle != null) {
      console.log(`IonitronDev: Ionic Serve 'close', clearing listener …`);
      clearTimeout(timeoutHandle);
    }
    console.log(`IonitronDev: Ionic Serve 'close', done`);
    process.exit();
  });
  // ionicServeProcess = childproc.exec('npm run start', (error, stdout, stderr) => {
  // ionicServeProcess = childproc.exec('ironic', (error, stdout, stderr) => {
  // ionicServeProcess = childproc.exec('ironic', (error, stdout, stderr) => {
    // if(error) {
      // throw error;
    // }
    // console.log(stdout);
  // });
  // console.log(`IonitronDev: Started Ionic Serve`);
};

var stdout = "\x1B[2J\x1B[0f";
process.stdout.write(stdout);

startIonicServe();
process.on('SIGINT', () => {
  console.log(`IonitronDev: Received SIGINT`);
  // if(electronProcess && typeof electronProcess.on != undefined) {
  // if(electronProcess && typeof electronProcess.kill != undefined) {
  if(electronProcess && typeof electronProcess.send != undefined) {
    console.log(`IonitronDev: Killing Electron process …`);
    electronProcess.send("SIGINT");
    // electronProcess.kill("SIGINT");
  }
  if(timeoutHandle != null) {
    console.log(`IonitronDev: Clearing listener …`);
    clearTimeout(timeoutHandle);
  }
  console.log(`IonitronDev: done`);
  process.exit();
});

const client = new net.Socket();
client.setTimeout(5000);

const doesExist = function(file) {
  try {
    let stats = fs.statSync(file);
    let exists = stats.isFile();
    return exists;
  } catch (error) {
    console.log("doesExist(): Error checking for file:", file);
    console.log(error);
    return false;
  }
};

const checkWebpackSuccess = function() {
  try {
    let wwwDir = process.env.IONIC_WWW_DIR || path.join(__dirname, 'www');
    let buildDir = process.env.IONIC_BUILD_DIR || path.join(__dirname, 'www', 'build');
    let vendorFile = path.join(buildDir, 'vendor.js');
    // console.log(`checkWebpackSuccess(): `);
    let ionics = {};
    let keys = Object.keys(process.env);
    for(let key of keys) {
      if(key.startsWith("IONIC")) {
        ionics[key] = process.env[key];
      }
    }
    let ionicenv = JSON.stringify(ionics);
    console.log(`checkWebpackSuccess(): Ionic ENV vars:`, ionicenv);
    console.log(`checkWebpackSuccess(): www dir is '${wwwDir}'`);
    console.log(`checkWebpackSuccess(): build dir is '${buildDir}'`);
    console.log(`checkWebpackSuccess(): vendor file is '${vendorFile}'`);
    return doesExist(vendorFile);
  } catch(err) {
    // throw err;
    return false;
  }
};

const closeEverything = function() {
  if(ionicServeProcess) {
    console.log(`IonitronDev.closeEverything(): Killing Ionic Serve ...`.bgBlue.white);
    ionicServeProcess.kill('SIGTERM');
  }
};

// const ionicConnected = () => {
// async function ionicConnected () {
const ionicConnected = function () {
  if(!startedElectron) {
    startedElectron = true;
    let succeeded = checkWebpackSuccess();
    if(!succeeded) {
      console.log(`IonitronDev: Ionic Build failed, aborting.`.bgRed.white.bold);
      closeEverything();
      return;
    }
    client.end();
    console.log(`IonitronDev: Ionic Build succeeded, starting Electron in '${homedir}' ...`.bgGreen.white.bold);
    // electronProcess = childproc.exec('electron . test');
    // electronProcess = childproc.spawn('node', [electronCLIPath, '.', 'test']);
    electronProcess = childproc.fork(electronCLIPath, ['.', 'test']);
    // electronProcess.on('exit', (code, signal) => {
    electronProcess.on('close', (code, signal) => {
      let datetime = moment().format();
      console.log(`IonitronDev: ELECTRON TERMINATED at ${datetime}`.bgBlue.white);
      if(ionicServeProcess) {
        console.log(`IonitronDev: Killing Ionic Serve ...`.bgBlue.white);
        ionicServeProcess.kill('SIGTERM');
      }
      console.log(`IonitronDev: IONIC SERVE TERMINATED! Now exiting dev script.`.bgBlue.white);
      process.exit();
    });
    // setTimeout(() => {
    //   console.log(`IonitronDev: STARTED!`.bgGreen.white.bold);
    // });
  } else {
    client.end();
    console.log(`IonitronDev: Electron already started.`.bgYellow.blue);
  }
};

// const tryConnection = () => client.connect({ port: port });
const tryConnection = () => {
  if(timeoutHandle != null || startedElectron) {
    return;
  } else {
    if(startAttempts % 4 === 1) {
      let current     = moment().unix();
      elapsed = current - start;
      console.log(`IonitronDev: ${elapsed} seconds elapsed`.bgYellow.blue);
    }
    timeoutHandle = setTimeout(() => {
      timeoutHandle = null;
      client.connect({ port: port });
    }, 5000);
  }
};
let startTime   = moment();
let startString = startTime.format("YYYY-MM-DD HH:mm:ss");
let start       = startTime.unix();
let last        = moment().unix();
let current     = moment().unix();
let elapsed     = current - start;
// console.log(`IonitronDev: Waiting ${secondsToWait} seconds for 'ionic serve' to finish building and start serving ...`.black.bgWhite);
// // let startupLoop = new moment.duration(1000).timer({loop: true}, () => {
// //   console.log();
// // });
// let loop2 = new moment.duration(1000).timer()
// console.log(`IonitronDev: At '${startString}', waiting ${secondsToWait} seconds for 'ionic serve' ...`.black.bgWhite);
// console.log(`IonitronDev: SCRIPT STARTING`.zebra);
console.log(`IonitronDev: At '${startString}', waiting for 'ionic serve' ...`.white.bgGreen);
tryConnection();

client.on('connect', ionicConnected);

client.on('error', (error) => {
  let code = error && error.code ? error.code : "UNKNOWN_ERROR";
  // console.log(`Connection failed, error is '${code}'`.bgRed.white);
  startAttempts++;
  tryConnection();
});

client.on('timeout', () => {
  // console.log(`IonitronDev: Connection timeout.`.cyan);
  client.end();
});
