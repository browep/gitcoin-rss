'use strict';

const rp = require('request-promise');

const ethBaseUrl = `http://localhost:8545`;

console.log(`started, eth url: ${ethBaseUrl}`);

const versionOptions =  {
    method: 'POST',
    url: ethBaseUrl,
    body: {
        'jsonrpc': '2.0',
        'method': 'web3_clientVersion',
        'params': [],
        'id': 67
    },
    json: true
}

rp(versionOptions)
    .then( (jsonBody)=> {
        console.log(jsonBody);

    })
    .catch( (err) => {
        console.log(err);

    });



