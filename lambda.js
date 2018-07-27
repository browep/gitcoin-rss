console.log('Loading function');

exports.handler = async (event, context) => {
    
    try {
        const gitcoinRss = require('./gitcoin-rss.js');
        await gitcoinRss.start();
    } catch (e) {
        console.log(`error: ${e.stack}`);
    }

};