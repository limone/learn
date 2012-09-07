// dependencies
var express = require('express'), app = express.createServer(), routes = require('./routes'), io = require('socket.io').listen(app);
var config = require('./config'), DBWrapper = require('node-dbi').DBWrapper/*, DBExpr = require('node-dbi').DBExpr*/;

// config
var dbConnectionConfig = { host:config.db.host, user:config.db.username, password:config.db.password, database:config.db.database };
var canConnect = testDbConnection();

// app config
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src:__dirname + '/public', enable:['less']}));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// disable logging in socket.io
io.set('log level', 1);

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);

app.listen(config.port, function () {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

io.sockets.on('connection', function (socket) {
  socket.on('sql', function (data) {
    query_db(socket, data);
  });

  socket.on('reconnect', function () {
    if (canConnect) {
      console.log("Connection to the database validated.");
      socket.emit("output", {"header":"Reconnected", "message":"We successfully (re)connected to the database."});
    } else {
      console.log("Could not connect to the database.");
      socket.emit("output", "Sadly, we could not (re)connect to the database at this time.", true);
    }
  });

  socket.on('list', function () {
    console.log("Listing available tables.");
    query_db(socket, {"nowrap":true, "query":"select table_catalog, table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and is_insertable_into='YES' and table_schema not in ('pg_catalog', 'information_schema') order by table_name;"});
  });

  socket.on('describe', function (data) {
    var table = data.split(" ")[1];
    console.log("Describing the table structure of: %s", table);
    query_db(socket, {"nowrap":true, "query":"select table_catalog, table_schema, table_name, column_name, ordinal_position, column_default, is_nullable, data_type from INFORMATION_SCHEMA.COLUMNS where table_name = '" + table + "' ORDER BY ordinal_position;"});
  });
});

function query_db(socket, data) {
  if (!canConnect) {
    console.log("Initial attempt to connect to the DB has not succeeded, will not proceed.");
    socket.emit("output", "We have not been able to connect to the database, please try again shortly.", true);
    return;
  }

  var pg_query = "";
  if (data.nowrap) {
    pg_query = data.query;
  } else {
    pg_query = "SELECT * FROM (" + data.query + ") as nquery LIMIT 100";
    if (data.offset != null) {
      pg_query += " OFFSET " + data.offset;
    }

    pg_query = pg_query.replace(";", "");
  }
  console.log("Executing the following query: %s", pg_query);

  console.log("Connecting to the DB.");
  var dbWrapper = new DBWrapper('pg', dbConnectionConfig);
  dbWrapper.connect();

  console.log("Querying DB.");
  dbWrapper.fetchAll(pg_query, null, function (err, result) {
    if (!err) {
      console.log("Data came back from the DB, pushing to the client.");
      socket.emit("output", {"result":result, "hasMore":(result.length == 100), "hasPrev":(data.offset != null)}, false);
    } else {
      console.log("DB returned an error: %s", err);
      socket.emit("output", "There was an error issuing the query: " + err, true);
    }

    dbWrapper.close(function (close_err) {
      console.log("Disconnected from server.");
      if (close_err) {
        console.log("Error while disconnecting: %s", close_err);
      }
    });
  });
}

function testDbConnection() {
  console.log("Testing DB connection.");
  var dbWrapper = new DBWrapper('pg', dbConnectionConfig);
  dbWrapper.connect(function (state) {
    if (state && state.name === "error") {
      console.log("Could not connect to the DB: %s", state.error);
      canConnect = false;
    } else {
      console.log("DB connection successful, allowing future attempts.");
      canConnect = true;
    }

    if (dbWrapper.isConnected()) {
      dbWrapper.close(function (err) {
        console.log("Disconnected from DB.");
        if (err) {
          console.log("Error while disconnecting from DB: %s", err);
        }
      })
    }
  });
}