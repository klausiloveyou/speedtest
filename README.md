# speedtest
Node JS application to run frequent internet speedtest and store results into an InfluxDB which is visualized with Grafana:

![Grafana](https://github.com/klausiloveyou/speedtest/blob/master/src/common/images/sample.jpg "Grafana Demo Snapshot")

This application is currently running on a RaspberryPi 4(b) directly connected to a router through 1Gbit LAN. Log files are written into a `logs` directory within the repository folder.

## Prerequisites
1. NodeJS to run speedtest script
   * `npm install` will download all Node dependencies from the `package.json`
2. [Docker](https://docs.docker.com/get-docker/) to run InfluxDB and Grafana applications

### InfluxDB for Docker
* Running the InfluxDB docker in detached mode (-d)
* Using restart option `always`
* Publishing standard ports
* Binding InfluxDB data directory (usefull to recover data in case)
```
 docker run -d --name=influxdb --restart=always -p 8086:8086 -v /abs/path/to/speedtest/repo/influxdb:/var/lib/influxdb influxdb
```
* No further configuration is required, run the appication once with `node src/app.js` to create the DB for InfluxDB

### Grafana for Docker
* Running the Grafana docker in detached mode (-d)
* Using restart option `always`
* Publishing standard ports
```
docker run -d --name=grafana --restart=always -p 3000:3000 grafana/grafana
```
* Set up Grafana and configure it to use the InfluxDB (speedtest_db), e.g. http://localhost:3000/ using standard credentials `admin/admin`
* An example [dashboard](https://github.com/klausiloveyou/speedtest/blob/master/grafana/sample-dashboard.json) can be imported

## Setting up Cron Job
* Collecting data via a cron job on an hourly basis, e.g. using `crontab`
```
crontab -e
```
* Add following line and adjust paths
```
0 * * * * /usr/bin/node /abs/path/to/speedtest/repo/src/app.js
```