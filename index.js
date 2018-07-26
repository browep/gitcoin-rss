'use strict';
const util = require('util');
const fs = require('fs');
const tmp = require('tmp');
const nconf = require('nconf');
const Feed = require('feed');
var _ = require('lodash');
const format = require('./lib/format.js')
const dao = require('./lib/dao.js');


nconf.argv()
    .env()
    .file({ file: './config.json' });

const repository = require('./lib/repository.js')(nconf);
const contract = require('./lib/contract.js')(nconf);

const bountyDataPromises = [];
for (let i = 0; i < 15 && i < contract.getNumBounties-1; i++) {
    bountyDataPromises.push(repository.dataForBounty(contract.getNumBounties-1-i, contract));
}

Promise.all(bountyDataPromises)
    .then((vals)=> {
        console.log(`all bounty return values\n${vals}`);
    })
    .catch((err)=>{
        console.error(`error: ${err.stack}`);

    });

const onNewItems = () => {
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

    for (let i = 1; i < 16; i++) {
        const bountyData = bountyArray[bountyArray.length - i];
        try {
            feed.addItem({
                title: bountyData.title,
                link: bountyData.webReferenceURL,
                description: format.toHtml(_.get(bountyData, "metadata.issueKeywords", bountyData.description)),
                content: format.toHtml(bountyData.description),
            })
        } catch (err) {
            console.error("issue with " + bountyData);
        }
    }

    const rssContent = feed.rss2();

    const rssOutputPath = '/tmp/gitcoin.rss';
    fs.writeFile(rssOutputPath, rssContent, (err) => {
        if (err) throw err;
        console.log(`wrote to ${rssOutputPath}`);

        var params = {
            localFile: rssOutputPath,

            s3Params: {
                Bucket: nconf.get('s3_bucket'),
                Key: "feed.rss",
            },
        };
        var uploader = s3Client.uploadFile(params);
        uploader.on('error', function (err) {
            console.error("unable to upload:", err.stack);
        });
        uploader.on('progress', function () {
            console.log("rss upload progress", uploader.progressMd5Amount,
                uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function () {
            console.log("done uploading rss file");
        });
    });


};