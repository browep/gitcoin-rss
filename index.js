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

var s3 = require('s3');
var s3Client = s3.createClient({
    s3Options: {
        accessKeyId: nconf.get("S3_KEY"),
        secretAccessKey: nconf.get("S3_SECRET"),
    },
});

const abiArray = require('./contract-abi.json');

const rp = require('request-promise');
const Web3 = require('web3');

const outputFile = `/tmp/gitcoinrss.json`;

const web3 = new Web3(new Web3.providers.HttpProvider(nconf.get('eth_address')));

const nodeVersion = web3.version.node;

console.log(`node version: ${nodeVersion}`);

const BountyContract = web3.eth.contract(abiArray);

const contractInstance = BountyContract.at(nconf.get('contract_address'));

console.log(`contractInstance: ${contractInstance}`);

const numBounties = contractInstance.getNumBounties();
console.log(`numBounties: ${numBounties}`);

const bountyArray = [];
var bountyWaitCount = numBounties;

const createBountyDataCallback = i => {
    return (error, bountyDataId) => {
        if (error) {
            console.log(`error: ${error}`);
            return;
        }

        rp(`${nconf.get('ipfs_url_base')}${bountyDataId}`)
            .then((resBody) => {
                const bountyData = JSON.parse(resBody);
                if (bountyData && bountyData.title) {
                    console.log(`${i}=${bountyData.title}`);
                    bountyArray[i] = bountyData;
                }
                else if (bountyData && bountyData.payload) {
                    console.log(`${i}=${bountyData.payload.title}`);
                    bountyArray[i] = bountyData.payload;
                }
                else {
                    console.log(`${i}=undefined`);
                }


                onBountyRetrieval();
            })
            .catch(err => {
                console.log(`error: ${err}`);
                onBountyRetrieval();
            })
    };
}

for (let i = 0; i < numBounties; i++) {
    contractInstance.getBountyData(i, createBountyDataCallback(i));
}

const onBountyRetrieval = () => {
    bountyWaitCount--;

    if (bountyWaitCount == 0) {
        // we have downloaded all the bounties we can. check the current state

        tmp.file((err, stateFileDownloadPath, fd, cleanupCallback) => {
            if (err) throw err;

            console.log('Tmp State File: ', stateFileDownloadPath);
            const stateFileS3Params = {
                localFile: stateFileDownloadPath,
                s3Params: {
                    Bucket: nconf.get('s3_bucket'),
                    Key: 'state.json'
                }
            }

            var downloader = s3Client.downloadFile(stateFileS3Params);
            downloader.on('error', function (err) {
                // could not find a state file, lets assume this is the first run
                if (err.message && err.message.includes("404")) {
                    onNewItems();
                } else {
                    console.error("unknown error downloading state file", err);
                }
            });
            downloader.on('end', function () {
                console.log("done downloading");
                fs.readFile(stateFileDownloadPath, (err, data) => {
                    if (err) throw err;
                    const currentState = JSON.parse(data);
                    console.log(`current state: ${currentState}`);
                    console.log(`currentState.count=${currentState.count}, bountyArray.length=${bountyArray.length}`);
                    if (currentState.count < bountyArray.length) {
                        // we have more bounties then there are in the current state
                        onNewItems();
                    } else {
                        // no new bounties
                        console.log(`no new bounties, done.`);
                    }
                });
            });
        });
    }
}

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