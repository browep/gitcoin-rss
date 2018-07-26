'use strict';
const util = require('util');
const fs = require('fs');
const tmp = require('tmp');
const nconf = require('nconf');
const Feed = require('feed');
var _ = require('lodash');
const format = require('./lib/format.js')


nconf.argv()
    .env()
    .file({ file: './config.json' });

const repository = require('./lib/repository.js')(nconf);
const contract = require('./lib/contract.js')(nconf);

const bountyArray = [];
for (let i = 0; i < 15 && i < contract.getNumBounties - 1; i++) {
    bountyArray.push(repository.dataForBounty(contract.getNumBounties - 1 - i, contract));
}

Promise.all(bountyArray)
    .then((vals) => {
        console.log(`num bounties: ${vals.length}`);

        // sort the bounty array according to created date
        let mappedVals = vals.map((val) => JSON.parse(val))
        let sortedVals = mappedVals.sort((b, a) => {
            if (a.payload.created < b.payload.created) {
                return -1;
            } else if (a.payload.created > b.payload.created) {
                return 1;
            } else { return 0; }
        });

        sortedVals.forEach((val) => console.log(`${val.payload.created}: ${val.payload.title}`));

        createFeedAndUpload(sortedVals);


    })
    .catch((err) => {
        console.error(`error: ${err.stack}`);

    });

const createFeedAndUpload = (bountyArray) => {
    console.log(`creating new feed with ${bountyArray.length} bounties`);

    let feed = new Feed({
        title: 'Gitcoin Bounties (Unofficial)',
        description: 'Gitcoin Bounties',
        id: 'https://github.com/browep/gitcoin-rss',
        link: 'https://github.com/browep/gitcoin-rss',
        image: 'https://s3-us-west-2.amazonaws.com/gitcoin-rss/gitcoin-logo.png',
        favicon: 'https://s3-us-west-2.amazonaws.com/gitcoin-rss/gitcoin-favicon.png',
        copyright: 'see Gitcoin',
        author: {
            name: 'Paul Brower',
            email: 'brower.paul@gmail.com',
            link: 'https://github.com/browep/gitcoin-rss'
        }
    });

    // if bountyArray does not have 15 elems, throw
    if (!bountyArray || bountyArray.length < 15) throw "expecting at least 15 bounties";

    bountyArray.forEach((bountyData) => {
        try {
            feed.addItem({
                title: bountyData.payload.title,
                link: bountyData.payload.webReferenceURL,
                description: format.toHtml(_.get(bountyData, "payload.metadata.issueKeywords", bountyData.payload.description)),
                content: format.toHtml(bountyData.payload.description),
            })
        } catch (err) {
            console.error("issue with " + bountyData + " " + err.stack);
        }
    });

    const rssContent = feed.rss2();

    repository.uploadRss(rssContent);


};