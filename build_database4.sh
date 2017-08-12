#!/bin/bash
#
# build_database4.sh - create empty temperature and humidity database for DS18B20 temp and Acurite temp + humidity sensors
#
# Chip Fleming 30 July 2017
sqlite3 piTempHum.db 'DROP TABLE th_records;'
sqlite3 piTempHum.db 'CREATE TABLE th_records(unix_time bigint primary key, ds18b20 real, acuriteTemp real, acuriteHum real, acuriteDP real);'

