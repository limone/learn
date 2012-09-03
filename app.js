// dependencies
var express = require('express'), app = express.createServer(), routes = require('./routes'), io = require('socket.io').listen(app);
var pg = require('pg');

// config
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src:__dirname + '/public', enable:['less']}));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// disable logging
io.set('log level', 1);

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

// Connect to the DB
var connString = "tcp://powerdns:powerdns2k10^^@plop/powerdns";

var client = null, connected = false, pg_err;
pg.connect(connString, function (err, pg_client) {
  if (err == null) {
    console.log("Connected to PG.");
    connected = true;
    client = pg_client;
  } else {
    pg_err = err;
    console.log("Could not connect to PG. " + err);
  }
});

// Routes
app.get('/', routes.index);

app.listen(9090, function () {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

io.sockets.on('connection', function (socket) {
  socket.on('sql', function (data) {
    console.log('Executing SQL statement: ' + data);
    query_pg(socket, data);
  });

  socket.on('list', function () {
    console.log("Listing available tables.");
    query_pg(socket, "select table_catalog, table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and is_insertable_into='YES' and table_schema not in ('pg_catalog', 'information_schema') order by table_name;");
  });

  socket.on('describe', function (data) {
    var table = data.split(" ")[1];
    console.log("Describing the table structure of: " + table);
    query_pg(socket, "select table_catalog, table_schema, table_name, column_name, ordinal_position, column_default, is_nullable, data_type from INFORMATION_SCHEMA.COLUMNS where table_name = '" + table + "';");
  });
});

function query_pg(socket, sql_query) {
  var hadError = false, error;

  if (connected) {
    try {

      var query = client.query(sql_query);
      var rows = [];

      query.on('error', function (pg_error) {
        console.log("PG returned an error: " + pg_error);
        hadError = true;
        error = "<p>There was an error issuing the query: " + pg_error + "</p>";
      });

      if (!hadError) {
        query.on('row', function (row) {
          rows.push(row);
        });

        query.on('end', function (result) {
          if (result != null) {
            console.log(result.rowCount + ' rows were received');
            socket.emit("sql-output", rows, false);
          }

          if (hadError) {
            socket.emit("sql-output", error, true)
          }
        })
      }
    } catch (exception) {
      console.log("PG threw an exception: " + exception);
      hadError = true;
      error = "<p>There was a problem with issuing the query: " + exception.message + "</p>";
    }
  } else {
    console.log("Not connect to PG, cannot execute query.");
    error = "<p>There was a problem connecting to the PG database: " + pg_err + "</p>";
  }
}