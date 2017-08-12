// server8.js - NodeJS server for the PiThermServer project.

/*
Parses data from DS18B20 temperature sensor and Acurite temperature and humidity sensor and serves as a JSON object.
Uses node-static module to serve a plot of current temperature (uses highcharts).

Original for DS18B20 by Tom Holderness 03/01/2013
Added Acurite sensor capability Chip Fleming 30July2017
Ref: www.cl.cam.ac.uk/freshers/raspberrypi/tutorials/temperature/
*/

// Load node modules
var fs = require('fs');
var util = require('util');
var http = require('http');
var async = require('async');
var sqlite3 = require('sqlite3');

// Use node-static module to server chart for client-side dynamic graph
var nodestatic = require('node-static');

// Setup static server for current directory
var staticServer = new nodestatic.Server(".");

// Setup database connection for logging
var db = new sqlite3.Database('./piTempHum.db');

// Write a single temperature record in JSON format to database table.
function insertTemp(data){
  // data is a javascript object
  var statement = db.prepare("INSERT INTO th_records VALUES (?, ?, ?, ?, ?)");
  // Insert values into prepared statement
  statement.run(data.th_record[0].unix_time, data.th_record[0].ds18b20, data.th_record[0].acuriteTemp, data.th_record[0].acuriteHum, data.th_record[0].acuriteDP);
  // Execute the statement
  statement.finalize();
}

// Read current temperature from sensors
function readTemp(callback){
  var d = new Date();
  var local_time = Date.now() - d.getTimezoneOffset()*60000;
  //console.log('Local time: ' + local_time);
  
  var sensorFiles = ['/sys/bus/w1/devices/28-000002afefb2/w1_slave', '/home/pi/rtl_433/temp.json'];  
  var buffer = [];  
  
  async.eachOfSeries(
    // Pass items to iterate over
    sensorFiles,
    
    // Pass iterator function that is called for each item
    function(filename, key, cb) {
      fs.readFile(filename, function(err, content) {
        if (!err) {
          buffer[key] = content;
          //console.log('content = ' + content);
        }
        // Calling cb makes it go to the next item.
        cb(err);
      });
    },
    
    // Final callback after each item has been iterated over.
    function(err) {
      if (err) {
        console.log('An error occurred when reading sensor files.');
      }
      else {
        var data = buffer[0].toString('ascii').split(" ");
        if (data.length == 21) {
          var tempDSC = parseFloat(data[data.length-1].split("=")[1])/1000.0;
        }
        else {
          var tempDSC = -20.0;
          console.log('Error in DS18B20 file length!  Length = ' + data.length);
        }

        // convert to Fahrenheit
        tempDSF = tempDSC * 9 / 5 + 32;

        // Round to one decimal place
        tempDSF = Math.round(tempDSF * 10) / 10;
        //console.log('tempDSF = ' + tempDSF);

        var data = buffer[1].toString('ascii').split(", ");
        if (data.length == 7) {
          var tempArC  = parseFloat(data[data.length-2].split(" : ")[1]);
          var humAr  = parseFloat(data[data.length-1].split(" : ")[1]);
        }
        else {
          var tempArC = -20.0;
          var humAr = 0.0;
          //console.log('Error in Acurite file length!  Length = ' + data.length);
        }
        
        // convert to Fahrenheit
        tempArF = tempArC * 9.0 / 5.0 + 32.0;

        // Round to one decimal place
        tempArF = Math.round(tempArF * 10) / 10;
        //console.log('tempArF = ' + tempArF);

        // Calculate dewpoint using NWS algorithm
        var esubs = 6.11 * Math.pow(10, 7.5 * tempArC / (237.3 + tempArC));
        var dewPointC = 237.3 * Math.log(esubs * humAr / 611 ) / (7.5 * Math.log(10) - Math.log(esubs * humAr / 611));
        
        //convert to Fahrenheit
        var dewPointF = 9.0 / 5.0 * dewPointC + 32.0;
        
        // round to one decimal place
        dewPointF = Math.round(dewPointF * 10) / 10;
        //console.log('dewPointF = ' + dewPointF);

        // Add date/time to temperature & humidity values
        var data = {
          th_record:[{
          unix_time: local_time,
          ds18b20: tempDSF,
          acuriteTemp: tempArF,
          acuriteHum: humAr,
          acuriteDP:  dewPointF
        }]};

        // Execute call back with data
        callback(data);   
      
      }
    }
  );  
};

// Create a wrapper function which we'll use specifically for logging
function logTemp(interval){
  // Call the readTemp function with the insertTemp function as output to get initial reading
   readTemp(insertTemp);
  // Set the repeat interval (milliseconds). Third argument is passed as callback function to first (i.e. readTemp(insertTemp)).
  setInterval(readTemp, interval, insertTemp);
};

// Get temperature records from database
function selectTemp(num_records, start_date, callback){
  // - Num records is an SQL filter from latest record back through time series,
  // - start_date is the first date in the time-series required,
  // - callback is the output function
  var current_temp = db.all("SELECT * FROM (SELECT * FROM th_records WHERE unix_time > (strftime('%s',?)*1000) ORDER BY unix_time DESC LIMIT ?) ORDER BY unix_time;", start_date, num_records,
  function(err, rows){
    if (err){
      response.writeHead(500, { "Content-type": "text/html" });
      response.end(err + "\n");
      console.log('Error serving querying database. ' + err);
      return;
    }
    data = {th_record:[rows]}
    callback(data);
  });
};

// Setup node http server
var server = http.createServer(
  // Our main server function
  function(request, response)
    {
      // Grab the URL requested by the client and parse any query options
      var url = require('url').parse(request.url, true);
      var pathfile = url.pathname;
      var query = url.query;

      // Test to see if it's a database query
      if (pathfile == '/temperature_query.json'){
       // Test to see if number of observations was specified as url query
      if (query.num_obs){
        var num_obs = parseInt(query.num_obs);
      }
      else{
      // If not specified default to 20. Note use -1 in query string to get all.
        var num_obs = -1;
      }
      if (query.start_date){
        var start_date = query.start_date;
      }
      else{
        var start_date = '1970-01-01T00:00';
      }
      // Send a message to console log
      console.log('Database query request from '+ request.connection.remoteAddress +' for ' + num_obs + ' records from ' + start_date+'.');
      // call selectTemp function to get data from database
      selectTemp(num_obs, start_date, function(data){
        response.writeHead(200, { "Content-type": "application/json" });
        response.end(JSON.stringify(data), "ascii");
      });
    return;
  }

  // Test to see if it's a request for current temperature
  if (pathfile == '/temperature_now.json'){
    readTemp(function(data){
      response.writeHead(200, { "Content-type": "application/json" });
      response.end(JSON.stringify(data), "ascii");
    });
    return;
  }

  // Handler for favicon.ico requests
  if (pathfile == '/favicon.ico'){
    response.writeHead(200, {'Content-Type': 'image/x-icon'});
    response.end();

    // Optionally log favicon requests.
    //console.log('favicon requested');
    return;
  }


  else {
    // Print requested file to terminal
    console.log('Request from '+ request.connection.remoteAddress +' for: ' + pathfile);

    // Serve file using node-static
    staticServer.serve(request, response, function (err, result) {
    if (err){
      // Log the error
      util.error("Error serving " + request.url + " - " + err.message);

      // Respond to the client
      response.writeHead(err.status, err.headers);
      response.end('Error 404 - file not found');
      return;
    }
    return;
    })
  }
});

// Start temperature logging (every 10 min).
var msecs = (60 * 10) * 1000; // log interval duration in milliseconds
logTemp(msecs);
// Send a message to console
console.log('Server is logging to database at '+msecs+'ms intervals');
// Enable server
server.listen(80);
// Log message
console.log('Server running at http://localhost:80/thlog.htm');
