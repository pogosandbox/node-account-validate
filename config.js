const fs = require('fs');
const logger = require('winston');
const yaml = require('js-yaml');
const _ = require('lodash');

module.exports.load = function() {

    let config = {
        pos: {
            lat: 48.8456222,
            lng: 2.3364526,
        },
        api: {
            version: '5100',
            country: 'US',
            language: 'en',
            timezone: 'Europe/Paris',
        },
        hashserver: {
            active: false,
        },
        proxy: {
            url: null,
        },
        csv: {
            separator: ";",
        },
        loglevel: 'info',
    };

    if (fs.existsSync('config.yaml')) {
        let loaded = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
        config = _.defaultsDeep(loaded, config);
    }

    logger.level = config.loglevel;
    logger.add(logger.transports.File, {filename: 'node-account-validate.log', json: false});

    return config;
};
