/**
 * encapsulate data retrieval
 */
'use strict';
var s3 = require('s3');
const rp = require("request-promise");
const tmp = require('tmp');
const fs = require('fs');

const respository = (nconf) => {

    const s3Client = s3.createClient({
        s3Options: {
            accessKeyId: nconf.get("S3_KEY"),
            secretAccessKey: nconf.get("S3_SECRET"),
        },
    });

    const s3PathForBountyData = (bountyId) => { return `bounty_data/${bountyId}.json` };

    const getS3ParamsForBountyData = (bountyId) => {
        return {
            Bucket: nconf.get('s3_bucket'),
            Key: s3PathForBountyData(bountyId)
        }
    }

    const fetchData = (bountyId, contract, resolve, reject) => {
        contract.getBountyData(bountyId)
            .then(([bountyId, bountyDataId]) => {
                fetchFromIpfs(bountyId, bountyDataId, resolve, reject);
            })
            .catch((err) => { reject(`could not get bountyData for ${bountyId}: ${err}`) });

    }

    const saveBufferToFile = (buffer) => {
        return new Promise((resolve, reject) => {

            tmp.file((err, path, fd, cleanupCallback) => {
                if (err) {
                    reject(err);
                } else {
                    fs.writeFile(path, buffer, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(path);
                        }
                    });
                }

            });
        })
    }

    const fetchFromIpfs = (bountyId, bountyDataId, resolve, reject) => {

        const ipfsUrl = `${nconf.get('ipfs_url_base')}${bountyDataId}`;
        console.log(`fetching ${ipfsUrl}`);

        rp(ipfsUrl)
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

                saveBufferToFile(resBody)
                    .then((filePath) => {
                        var params = {
                            localFile: filePath,
                            s3Params: getS3ParamsForBountyData(bountyId)
                        };
                        var uploader = s3Client.uploadFile(params);

                        uploader.on('error', function (err) {
                            console.error("unable to upload:", err.stack);
                            reject(err);
                        });
                        uploader.on('end', function () {
                            console.log(`done uploading ${s3PathForBountyData(bountyId)} file`);
                            resolve(resBody);
                        });
                    }).catch((err) => reject)

            })
            .catch(err => { reject(err); })
    }

    const dataForBounty = (bountyId, contract) => {

        console.log(`creating promise for ${bountyId}`);

        return new Promise((resolve, reject) => {

            // check to see if its in s3
            s3Client.downloadBuffer(getS3ParamsForBountyData(bountyId))
                .on('error', (err) => {
                    console.log(`error downloading ${s3PathForBountyData(bountyId)}`);

                    if (err.message && err.message.includes("404")) {
                        // did not find the file in s3, get it from ipfs
                        fetchData(bountyId, contract, resolve, reject);
                    } else {
                        reject(`issue with ${bountyId}: ${err}`);
                    }

                })
                .on('end', (buffer) => {
                    resolve(buffer);
                });
        });

    }

    return {
        dataForBounty: dataForBounty,
    }

};

module.exports = respository;

