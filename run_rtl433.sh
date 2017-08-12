#!/bin/sh
#
# run rtl_433 with frequency 433.96 MHz, 60 ppm oscillator offset, quiet mode, file output type JSON, 45 second timeout
# Because we only graph a point every 5 minutes, this is invoked by cron every 5 minutes
# to avoid excessive writes to the temp.json file.
#
/usr/local/bin/rtl_433 -f 433960000 -p 60 -q -F json:/home/pi/rtl_433/temp.json -T 60

