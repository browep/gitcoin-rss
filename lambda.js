console.log('Loading function');

exports.handler = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('value1 =', event.key1);
    console.log('value2 =', event.key2);
    console.log('value3 =', event.key3);


    const options = {
        method: 'POST',
        url: "https://mainnet.infura.io/ROrDhANkiwtoZBhdXEtg",
        body: {
            jsonrpc: "2.0",
            method: "web3_clientVersion",
            params: [],
            id: 67
        },
        json: true,
    }

    try {
        const body = await require("request-promise").post(options);
        console.log(`body: ${JSON.stringify(body)}`);
        require('./gitcoin-rss.js');

    } catch (e) {
        console.log(`error: ${e.stack}`);
    }




    return event.key1;  // Echo back the first key value
    // throw new Error('Something went wrong');
};