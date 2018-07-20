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
    return (error, bountyDataId) => {
        if (error) {
            console.log(`error: ${error}`);
            return;
        }

        rp(`https://ipfs.io/ipfs/${bountyDataId}`)
            .then((resBody) => {
                const bountyData = JSON.parse(resBody);
                if (bountyData && bountyData.payload) {
                    console.log(`${i}=${bountyData.payload.title}`);}
                else {
                    console.log(`${i}=undefined`);
                }

            })
            .catch(err => {
                console.log(err);
            })
    };
} 

for ( let i = 0; i < numBounties; i++) {
    contractInstance.getBountyData(i, createBountyDataCallback(i));
}



