'use strict';

const abiArray = require('../contract-abi.json');

const Web3 = require('web3');


const contract = (nconf) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(nconf.get('eth_address')));
    const nodeVersion = web3.version.node;
    console.log(`node version: ${nodeVersion}`);
    const BountyContract = web3.eth.contract(abiArray);
    const contractInstance = BountyContract.at(nconf.get('contract_address'));
    console.log(`contractInstance: ${contractInstance}`);
    const numBounties = contractInstance.getNumBounties();
    console.log(`numBounties: ${numBounties}`);

    const getBountyData = (bountyId) => {
        return new Promise((resolve, reject) => {
            contractInstance.getBountyData(bountyId, (error, bountyData) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([bountyId, bountyData]);
                }
            });
        });
    };

    return {
        getBountyData: getBountyData,
        getNumBounties: numBounties
    }
}

module.exports = contract;