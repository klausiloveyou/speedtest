'use strict';

/**
 * @author klausiloveyou <klausiloveyou@gmail.com>
 */

const path = require('path'),
    Influx = require('influx'),
    speedTest = require('speedtest-net'),
    log4js = require('log4js');

const maxRetries = 3,
    scriptname = path.basename(__filename, path.extname(__filename)),
    logFile = path.join(__dirname, '..', 'logs', 'speedtest.log');

let retries = 0;

/**
 * Configure InfluxDB connection, DB and schema
 */
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'speedtest_db',
    schema: [
        {
            measurement: 'ping',
            fields: {
                jitter: Influx.FieldType.FLOAT,
                latency: Influx.FieldType.FLOAT,
                packetLoss: Influx.FieldType.FLOAT
            },
            tags: [
                'location',
                'country',
                'host',
                'isp'
            ]
        },
        {
            measurement: 'download',
            fields: {
                bandwidth: Influx.FieldType.INTEGER,
                bytes: Influx.FieldType.INTEGER,
                elapsed: Influx.FieldType.INTEGER
            },
            tags: [
                'location',
                'country',
                'host',
                'isp'
            ]
        },
        {
            measurement: 'upload',
            fields: {
                bandwidth: Influx.FieldType.INTEGER,
                bytes: Influx.FieldType.INTEGER,
                elapsed: Influx.FieldType.INTEGER
            },
            tags: [
                'location',
                'country',
                'host',
                'isp'
            ]
        }
    ]
});

/**
 * Configure the logger
 */
log4js.configure({
    appenders: {
        [scriptname]: { type: 'dateFile', filename: logFile, compress: true }
    },
    categories: {
        default: { appenders: [scriptname], level: 'debug' }
    }
});

// Retrieve the logger
const logger = log4js.getLogger(scriptname);

/**
 * Create InfluxDB database or and run the speedtest, creation is skipped when DB already exists
 */
influx.getDatabaseNames()
    .then(names => {
        if (!names.includes('speedtest_db')) {
            return influx.createDatabase('speedtest_db');
        }
    })
    .then(() => {
        runSpeedTest();
    })
    .catch(err => {
        logger.error('Error creating Influx database');
    });

/**
 * Execute the speedtest and write results into InfluxDB
 */
async function runSpeedTest() {
    const retryStr = (retries > 0) ? `(${retries}. retry)` : '';
    const start = Date.now();
    logger.info(`Running speedtest ${retryStr}`);
    await speedTest({ acceptLicense: true, acceptGdpr: true })
        .then(res => {
            logger.info(`Finished speedtest '${res.result.id}' sucessfully in ${Math.floor((Date.now() - start) / 1000)}s`);
            //console.log(res);
            influx.writePoints([
                {
                    measurement: 'ping',
                    tags: { location: res.server.location, country: res.server.country, host: res.server.host, isp: res.isp },
                    fields: { jitter: res.ping.jitter, latency: res.ping.latency, packetLoss: res.packetLoss }
                },
                {
                    measurement: 'download',
                    tags: { location: res.server.location, country: res.server.country, host: res.server.host, isp: res.isp },
                    fields: res.download
                },
                {
                    measurement: 'upload',
                    tags: { location: res.server.location, country: res.server.country, host: res.server.host, isp: res.isp },
                    fields: res.upload
                }
            ]).catch(err => {
                console.error(`Error saving data to InfluxDB\n${err.stack}`)
            })
        })
        .catch(err => {
            if (retries < maxRetries) {
                logger.error(`Finished speedtest with error in ${Math.floor((Date.now() - start) / 1000)}s\n${err}`);
                retries++;
                runSpeedTest();
            } else {
                logger.fatal(`Terminated speedtest after ${maxRetries} retries, no data has been saved\n${err}`);
            }
        });
}
