'use strict';

const ethBaseUrl = `http://localhost:8545`;
const contractAddress = `0x2af47a65da8CD66729b4209C22017d6A5C2d2400`;
const abiArray = require('./contract-abi.json');

const rp = require('request-promise');
const Web3 = require('web3');
console.log(`started, eth url: ${ethBaseUrl}`);

const web3 = new Web3(new Web3.providers.HttpProvider(ethBaseUrl));

const nodeVersion = web3.version.node;

console.log(`node version: ${nodeVersion}`);

const BountyContract = web3.eth.contract(abiArray);

const contractInstance = BountyContract.at(contractAddress);

console.log(`contractInstance: ${contractInstance}`);

const numBounties = contractInstance.getNumBounties();
console.log(`numBounties: ${numBounties}`);

const createBountyDataCallback = i => {
    return (error, bountyData) => {
        if (error) {
            console.log(`error: ${error}`);
            return;
        }
        console.log(`${i}=${bountyData}`);
    };
} 

for ( let i = 0; i < 10; i++) {
    contractInstance.getBountyData(i, createBountyDataCallback(i));
}



