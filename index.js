'use strict';

const fs = require('fs');
const nconf = require('nconf');
nconf.argv()
    .env()
    .file({ file: './config.json' });

var s3 = require('s3');
var client = s3.createClient({
    s3Options: {
      accessKeyId: nconf.get("S3_KEY"),
      secretAccessKey: nconf.get("S3_SECRET"),
    },
  });

const abiArray = require('./contract-abi.json');

const rp = require('request-promise');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider(nconf.get('eth_address')));

const nodeVersion = web3.version.node;

console.log(`node version: ${nodeVersion}`);

const BountyContract = web3.eth.contract(abiArray);

const contractInstance = BountyContract.at(nconf.get('contract_address'));

console.log(`contractInstance: ${contractInstance}`);

const numBounties = contractInstance.getNumBounties();
console.log(`numBounties: ${numBounties}`);

const bountyArray = [];

const createBountyDataCallback = i => {
    return (error, bountyDataId) => {
        if (error) {
            console.log(`error: ${error}`);
            return;
        }

        rp(`${nconf.get('ipfs_url_base')}${bountyDataId}`)
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

