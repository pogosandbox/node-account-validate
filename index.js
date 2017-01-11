let fs = require('fs');
let Promise = require('bluebird');
let csvparse = require('csv-parse/lib/sync');
let logger = require('winston');
let _ = require('lodash');

Promise.promisifyAll(fs);

let config = require('./config.js').load();

let PogoHelper = require('./pogo.helper');

fs.readFileAsync('accounts.csv', 'utf8')
.then(content => {
    var accounts = csvparse(content, {
        columns: true,
        delimiter: config.csv.separator,
    });

    accounts = _.filter(accounts, account => account.type != '');
    
    return Promise.map(accounts, account => {
        logger.info('Account %s', account.login);
        let pogo = new PogoHelper(config);
        return pogo.login(account.type, account.login, account.password)
                .then(() => pogo.checkAndCompleTutorial());
    });
})
.catch(e => {
    logger.error(e);
})
.then(() => {
    logger.info('Done.');
    process.exit();
});