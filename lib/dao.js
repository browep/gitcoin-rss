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

const daoFileS3Key = 'dao.ldj';

var s3DaoLocalFilePath;

const getS3DaoFileParams = () => {
    return {
        localFile: s3DaoLocalFilePath,
        s3Params: {
            Bucket: nconf.get('s3_bucket'),
            Key: daoFileS3Key
        }
    }
};

const parseLine = (line) => {
    const indexOfFirstComma = line.indexOf(',')

    const currentId = parseInt(line.substring(0, indexOfFirstComma));
    const jsonData = line.substring(indexOfFirstComma + 1);

    return [currentId, jsonData];
}

const getClient = () => {

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
        tmp.file((err, _s3DaoLocalFilePath, fd, cleanupCallback) => {

            s3DaoLocalFilePath = _s3DaoLocalFilePath;

            if (err) {
                reject(err);
                return;
            }

            daoLocalFilePath = s3DaoLocalFilePath;

            console.log('Tmp Dao File: ', s3DaoLocalFilePath);

            var downloader = getClient().downloadFile(getS3DaoFileParams());
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
                console.log(`fetching from ipfs ${bountyId}`);
                fetchFromIpfs(bountyId, bountyDataId, resolve, reject);
            } else {
                // metadata found, parse and resolve
                console.log(`found in file ${bountyId}`);
                resolve(parseLine(foundLine))
            }
        });

        lineReader.on('line', function (line) {
            let [currentId, jsonData] = parseLine(line);

            if (parseInt(bountyId) == parseInt(currentId)) {
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

/**
 * commit all the changes, sort, de-dupe
 */
const commit = () => {
    var spawn = require('child_process').spawn;
    var sortProcess = spawn('sort', [daoLocalFilePath]);
    sortProcess.stdout.setEncoding('utf8');
    sortProcess.stdout.on('data', (data)=>console.log);
    sortProcess.stdout.on('close', (code, signal) => {
        console.log(`sort process: ${code}`);
        // upload now to s3
        var uploader = getClient().uploadFile(getS3DaoFileParams());
        uploader.on('error', function (err) {
            console.error("unable to upload:", err.stack);
        });
        uploader.on('progress', function () {
            console.log("upload progress", uploader.progressMd5Amount,
                uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function () {
            console.log("done uploading dao file");
        });
    });
}

module.exports.connect = connect;
module.exports.getMetadata = getMetadata;
module.exports.commit = commit;

