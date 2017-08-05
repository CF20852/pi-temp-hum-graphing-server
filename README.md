PiThermServer
=============

Simple NodeJS server and SQLite3 logger for the DS18B20 digital temperature sensor on the Raspberry Pi.  Based on PiThermServer by Tomas Holderness.

Description
-----------
A NodeJS server for the DS18B20 GPIO temperature sensor and the Acurite 06009RM temperature/humidity sensor on the Raspberry Pi. The DS18B20 sensor is accessed using the w1-gpio and w1-therm kernel modules in the Raspbian distro. The Acurite sensor transmits at a nominal 433.92 MHz using amplitude-shift keying, and is received via an R820T-based SDR receiver and the rtl_433 software-defined radio code.  The server parses data from the sensors and returns the temperatures and humidity and a Unix time-stamp in JSON format, this is then written to an SQLite database on the Pi. A simple front-end is included and served using node-static, which performs ajax calls to the server/database and plots DS18B20 temperature, Acurite temperature, derived dewpoint temperature, and Acurite humidity from a time-series, using the highcharts JavaScript library.

Files
-----
* load_gpio.sh - bash commands to load kernel modules
* server4.js - NodeJS server, returns temperature as JSON, logs to database and serves other static files
* temphum_logr4.htm - example client front-end showing time-series from database records
* build_database4.sh - shell script to create database schema

Dependencies
------------
* NodeJS
* SQLite3
* node-sqlite3
* node-static
* rtl_433, which in turn depends on rtl-sdr.

Install/Setup
-------------
1. Run `npm install` in this directory
2. Run `load_gpio.sh` script as root to load kernel modules for the DS18B20 sensor
3. Run the `build_database4.sh` script to create "piTemps.db". Note this wil drop any existing database of the same name in the directory
4. Open "server4.js" and edit line 35 to read the serial number of your sensor in /sys/bus.
5. In a terminal run "node server4.js" to start the server.
6. Open a web browser on the Pi and go to http://localhost:8087/temphum_logr4.htm to see a plot logged temperature. 

References
----------
http://www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/
https://github.com/talltom/PiThermServer
https://github.com/merbanan/rtl_433
