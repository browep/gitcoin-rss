'use strict';

const gitcoinRss = require('./gitcoin-rss.js');

gitcoinRss.start()
    .then(()=>{
        console.log("finished");
    })
    .catch(err=>{
        console.log(err.stack);
    })
