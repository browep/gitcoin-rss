/**
 * abstract out the data access
 */
'use strict';
var s3 = require('s3');
const fs = require('fs');
const readLine = require('readline');
const rp = require('request-promise');
const tmp = require('tmp');

var daoLocalFilePath;
var nconf;

const parseLine = (line) => {
    const indexOfFirstComma = line.indexOf('.')

    const currentId = parseInt(line.substring(0, indexOfFirstComma));
    const jsonData = line.substring(indexOfFirstComma + 1);

    return currentId, jsonData;
}

const getClient = (nconf) => {

    return s3.createClient({
        s3Options: {
            accessKeyId: nconf.get("S3_KEY"),
            secretAccessKey: nconf.get("S3_SECRET"),
        },
    });
}

const connect = (_nconf) => {

    nconf = _nconf;

    return new Promise((resolve, reject) => {

        // pull down the s3 file
        tmp.file((err, s3DaoLocalFilePath, fd, cleanupCallback) => {

            if (err) {
                reject(err);
                return;
            }

            daoLocalFilePath = s3DaoLocalFilePath;

            console.log('Tmp Dao File: ', s3DaoLocalFilePath);
            const daoFileS3Params = {
                localFile: s3DaoLocalFilePath,
                s3Params: {
                    Bucket: nconf.get('s3_bucket'),
                    Key: 'dao.ldj'
                }
            }

            var downloader = getClient(nconf).downloadFile(daoFileS3Params);
            downloader.on('error', function (err) {
                if (err.message && err.message.includes("404")) {
                    // could not find a dao file, no prob continue without it
                    console.log("no dao file exists on s3");
                    resolve();
                    
                } else {
                    console.error("unknown error downloading state file", err);
                    reject(err);
                }
            });
            downloader.on('end', function () {
                console.log("done downloading dao file");
                resolve();
            });
        });
    });

};

const getMetadata = (bountyId, bountyDataId) => {

    return new Promise((resolve, reject) => {
        // read through the file, line by line to see if exists
        var lineReader = readLine.createInterface({
            input: fs.createReadStream(daoLocalFilePath)
        });

        var foundLine = undefined;

        lineReader.on('close', () => {

            if (!foundLine) {
                // we do not have data for this bounty, fetch it from ipfs
                fetchFromIpfs(bountyId, bountyDataId, resolve, reject);
            } else {
                // metadata found, parse and resolve
                resolve(parseLine(foundLine))
            }
        });

        lineReader.on('line', function (line) {
            const currentId = parseLine(line);

            if (bountyId == parseInt(currentId)) {
                foundLine = line;
            }

        });
    });
}

const fetchFromIpfs = (bountyId, bountyDataId, resolve, reject) => {

    rp(`${nconf.get('ipfs_url_base')}${bountyDataId}`)
        .then((resBody) => {
            const bountyData = JSON.parse(resBody);

            var bountyPayload;

            if (bountyData && bountyData.title) {
                bountyPayload = bountyData;
            }
            else if (bountyData && bountyData.payload) {
                bountyPayload = bountyData.payload;
            }
            else {
                console.log(`${i}=undefined`);
            }

            if (bountyPayload) {
                fs.appendFile(daoLocalFilePath, `${bountyId},${JSON.stringify(bountyPayload)}\n`, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(bountyId, bountyPayload);
                });
            } else {
                reject(`could not find body payload for ${bountyId}`);
            }
        })
        .catch(err => { reject(err); })
}

module.exports.connect = connect;
module.exports.getMetadata = getMetadata;
