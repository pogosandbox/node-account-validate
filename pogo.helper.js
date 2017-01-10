let _ = require('lodash');
let Promise = require('bluebird');
let pogobuf = require('pogobuf');
let logger = require('winston');

class PogoHelper {
    constructor(config) {
        this.config = config;
        this.client = new pogobuf.Client({
            version: config.api.version,
            useHashingServer: config.hashserver.active,
            hashingKey: config.hashserver.key,
            mapObjectsThrottling: false,
            includeRequestTypeInResponse: true,
            proxy: config.proxy.url,
            maxTries: 1,
        });
        this.pos = this.fuzzedLocation(this.config.pos);
        this.deviceid = _.times(32, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
        this.client.setOption('signatureInfo', _.bind(this.signature, this));
    }

    login(type, login, password) {
        this.login = login;
        let auth = type == 'ptc' ? (new pogobuf.PTCLogin()) : (new pogobuf.GoogleLogin());
        if (this.config.proxy.url) auth.setProxy(this.config.proxy.url);
        logger.info('  loggin in...');
        return auth.login(login, password)
                .then(token => {
                    this.client.setAuthInfo(type, token);
                })
                .then(() => {
                    logger.info('  init api...');
                    this.client.setPosition(this.pos.lat, this.pos.lng);
                    return this.client.init(false);
                });
    }

    checkAndCompleTutorial() {
        return this.client.getPlayer(this.config.api.country, this.config.api.language, this.config.api.timezone)
                .then(response => {
                    this.player = response.player_data;
                    logger.info('  get state ok');

                    let tuto = this.player.tutorial_state || [];
                    if (_.difference([0, 1, 3, 4, 7], tuto).length != 0) {
                        return this.completeTutorial()
                                .then(() => {
                                    logger.info('  tutorial done.');
                                });
                    } else {
                        logger.info('  tutorial already done.');
                    }
                });
    }

    completeTutorial() {
        let tuto = this.player.tutorial_state || [];
        let client = this.client;

        return Promise.delay(_.random(2.0, 5.0))
        .then(() => {
            if (!_.includes(tuto, 0)) {
                logger.info('  accept tos...');
                // complete tutorial
                let batch = client.batchStart();
                batch.markTutorialComplete(0, false, false);
                return this.alwaysinit(batch).batchCall();
            }

        }).then(() => {
            if (!_.includes(tuto, 1)) {
                logger.info('  set avatar...');

                let batch = client.batchStart();
                batch.setAvatar(
                    _.random(1, 3), // skin
                    _.random(1, 5), // hair
                    _.random(1, 3), // shirt
                    _.random(1, 2), // pants
                    _.random(0, 3), // hat
                    _.random(1, 6), // shoes,
                    0, // gender,
                    _.random(1, 4), // eyes,
                    _.random(1, 5) // backpack
                );
                
                this.alwaysinit(batch).batchCall()
                    .then(() => {
                        let batch = client.batchStart();
                        batch.markTutorialComplete(1, false, false);
                        return this.alwaysinit(batch).batchCall();
                    });
            }

        }).then(() => {
            if (!_.includes(tuto, 3)) {
                logger.info('  encounter tutorial...');

                let batch = client.batchStart();
                let pkmId = [1, 4, 7][_.random(3)];
                batch.encounterTutorialComplete(pkmId);
                return this.always(batch).batchCall();
            }

        }).then(() => {
            if (!_.includes(tuto, 4)) {
                logger.info('  claim code name %s...', this.login);

                let batch = client.batchStart();
                batch.claimCodename(this.login);
                return this.alwaysinit(batch).batchCall()
                        .then(responses => {
                            if (!Array.isArray(responses)) responses = [responses];
                            let response = _.find(responses, response => response._requestType == 403);
                            if ([2, 3, 5].indexOf(response.status) >= 0) {
                                logger.error('  WARNING: unable to claim user name.');
                            }

                            batch = client.batchStart();
                            batch.markTutorialComplete(4, false, false);
                            return this.alwaysinit(batch).batchCall();
                        });
            }

        }).then(() => {
            if (!_.includes(tuto, 7)) {
                logger.info('  buddy tutorial...');

                let batch = client.batchStart();
                batch.markTutorialComplete(7, false, false);
                return this.always(batch).batchCall();
            }

        });
    }

    randGPSFloatBetween(min, max) {
        return parseFloat((Math.random()*(max-min)+min).toFixed(10));
    }

    fuzzedLocation(latlng) {
        return {
            lat: parseFloat((latlng.lat + this.randGPSFloatBetween(-0.00001, 0.00001)).toFixed(10)),
            lng: parseFloat((latlng.lng + this.randGPSFloatBetween(-0.00001, 0.00001)).toFixed(10)),
        };
    }

    alwaysinit(batch) {
        // return batch.checkChallenge()
        //             .getHatchedEggs()
        //             .getInventory(this.state.api.inventory_timestamp)
        //             .checkAwardedBadges()
        //             .downloadSettings(this.state.api.settings_hash);
        return batch;
    }

    always(batch) {
        // return this.alwaysinit(batch).getBuddyWalked();
        return batch;
    }

    signature() {
        return {
            location_fix: [
                {
                    provider: 'fused',
                    latitude: this.pos.lat,
                    longitude: this.pos.lng,
                    altitude: _.random(300, 400, true),
                    provider_status: 3,
                    location_type: 1,
                    floor: 0,
                    course: -1,
                    speed: -1,
                    vertical_accuracy: _.random(35, 100, true),
                    horizontal_accuracy: 65,
                }
            ],
            device_info: {
                device_id: this.deviceid,
                device_brand: 'Apple',
                device_model: 'iPhone',
                device_model_boot: 'iPhone8,1',
                hardware_manufacturer: 'Apple',
                hardware_model: 'N71AP',
                firmware_brand: 'iOS',
                firmware_type: '10.2',
            },
            activity_status: {
                stationary: true,
            },
        }
    }
}

module.exports = PogoHelper;
