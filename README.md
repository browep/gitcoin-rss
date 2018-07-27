# Unofficial Gitcoin Rss Feed

feed link-> [https://s3-us-west-2.amazonaws.com/gitcoin-rss/feed.rss](https://s3-us-west-2.amazonaws.com/gitcoin-rss/feed.rss)

### About

I wanted to get a little exprience doing some NodeJS, AWS Lambda and S3 as well as poking around with querying smart contracts.  

This small project allowed me to do all of those. A blog post is to come with some takeaways on the dev experience.

### Using this code

Implemented with NodeJS v8.0.0 and NPM v5.0.0.

If you want to deploy this you need to supply configuration params that Nconf can find ( ENV vars are fine or can be sent in the command line or put in `./config.json`)

`S3_KEY` = AWS IAM key 

`S3_SECRET` = AWS IAM secret

`eth_address` = link to ethereum node to pull data from

There are two entry points to the app for lambda and for local dev:

`node index.js` will run it locally

`lambda.js` is for running it in AWS lambda.