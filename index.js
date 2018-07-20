'use strict';

const ethBaseUrl = `http://localhost:8545`;

const rp = require('request-promise');
const Web3 = require('web3');
console.log(`started, eth url: ${ethBaseUrl}`);

const web3 = new Web3(new Web3.providers.HttpProvider(ethBaseUrl));

const nodeVersion = web3.version.node;

console.log(`node version: ${nodeVersion}`);



