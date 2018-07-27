'use strict';

const abiArray = require('../contract-abi.json');

const Web3 = require('web3');

const contract = (nconf) => {
    const ethNodeAddress = nconf.get('eth_address');
    console.log(`connecting to ${ethNodeAddress}`);

    const web3 = new Web3(new Web3.providers.HttpProvider(ethNodeAddress));
    const BountyContract = web3.eth.contract(abiArray);
    const contractInstance = BountyContract.at(nconf.get('contract_address'));
    console.log(`contractInstance: ${contractInstance}`);

    const getNumBounties = (cb) => {
        console.log("getting number of bounties");
        
        contractInstance.getNumBounties(cb);
    }

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
        getNumBounties: getNumBounties
    }
}

module.exports = contract;