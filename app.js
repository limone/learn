// load stuff that has no pre-reqs
var express = require('express'), DBWrapper = require('node-dbi').DBWrapper;
var Logger = require('devnull'), log = new Logger;
var _ = require('underscore'), ih = require('insanehash').crypto;

// config - load this first so we can figure out what kind of express stuff we need to do
var config = require('./config');

var app, secondaryApp;
if (config.enableSsl) {
  var fs = require("fs");

  httpsOptions = {
    key: fs.readFileSync(config.sslKey),
    cert:fs.readFileSync(config.sslCert)
  }
  app = express.createServer(httpsOptions);
  secondaryApp = express.createServer();

  secondaryApp.all('*', function (req, res) {
                     var hostname = ( req.headers.host.match(/:/g) ) ? req.headers.host.slice(0, req.headers.host.indexOf(":")) : req.headers.host

                     var redirectUrl = "https://" + hostname;
                     if (config.sslPort != 443) {
                       redirectUrl += ":" + config.sslPort;
                     }
                     redirectUrl += req.url;

                     log.debug("HTTP: %s - redirecting to %s", req.url, redirectUrl);
                     res.redirect(redirectUrl);
                   }
  )
  secondaryApp.listen(config.port);
  log.info("SSL support was configured - server will listen on %d for HTTP requests which will redirect to the secure port on %d.", config.port, config.sslPort);
} else {
  log.info("SSL support NOT configured - server will listen for plain HTTP requests on port %d.", config.port);
  app = express.createServer();
}

// stuff that is loaded now that we know what our *REAL* app should be
var routes = require('./routes'), io = require('socket.io').listen(app);

// DB/runtime config
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

// Authentication
var realm = require('express-http-auth').realm('learn!');
var checkUser = function (req, res, next) {
  log.debug("Validating authentication for user %s.", req.username);

  var validUser = false;
  _.each(config.auth.users, function (user) {
    if (req.username.toLowerCase() === user.user.toLowerCase()) {
      log.debug("Comparing credentials for %s.", req.username);
      if (ih.skein(req.password) === user.password) {
        log.debug("Validated credentials for %s successfully.", req.username);
        next();
        validUser = true;
        return;
      }
    }
  });

  if (!validUser) {
    log.warning("Could not validate credentials for %s.", req.username);
    res.send(403);
  }
}

var private = [realm, checkUser];

// Routes
app.get('/', private, routes.index);

app.listen(config.enableSsl ? config.sslPort : config.port, function () {
  log.debug("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

io.sockets.on('connection', function (socket) {
  socket.on('sql', function (data) {
    query_db(socket, data);
  });

  socket.on('reconnect', function () {
    if (canConnect) {
      log.debug("Connection to the database validated.");
      socket.emit("output", {"header":"Reconnected", "message":"We successfully (re)connected to the database."});
    } else {
      log.debug("Could not connect to the database.");
      socket.emit("output", "Sadly, we could not (re)connect to the database at this time.", true);
    }
  });

  socket.on('list', function () {
    log.debug("Listing available tables.");
    query_db(socket, {"nowrap":true, "query":"select table_catalog, table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and is_insertable_into='YES' and table_schema not in ('pg_catalog', 'information_schema') order by table_name;"});
  });

  socket.on('describe', function (data) {
    var table = data.split(" ")[1];
    log.debug("Describing the table structure of: %s", table);
    query_db(socket, {"nowrap":true, "query":"select table_catalog, table_schema, table_name, column_name, ordinal_position, column_default, is_nullable, data_type from INFORMATION_SCHEMA.COLUMNS where table_name = '" + table + "' ORDER BY ordinal_position;"});
  });
});

function query_db(socket, data) {
  if (!canConnect) {
    log.debug("Initial attempt to connect to the DB has not succeeded, will not proceed.");
    socket.emit("output", "We have not been able to connect to the database, please try again shortly.", true);
    return;
  }

  var pg_query = "";
  if (data.nowrap) {
    pg_query = data.query;
  } else {
    pg_query = "SELECT * FROM (" + data.query + ") as nquery LIMIT 100";
    if (data.offset != null && data.offset >= 0) {
      pg_query += " OFFSET " + data.offset;
    }

    pg_query = pg_query.replace(";", "");
  }
  log.debug("Executing the following query: %s", pg_query);

  log.debug("Connecting to the DB.");
  var dbWrapper = new DBWrapper('pg', dbConnectionConfig);
  dbWrapper.connect();

  log.debug("Querying DB.");
  dbWrapper.fetchAll(pg_query, null, function (err, result) {
    if (!err) {
      log.debug("Data came back from the DB, pushing to the client.");
      socket.emit("output", {"query":data.query, "result":result, "hasMore":(result.length == 100), "hasPrev":(data.offset != null && data.offset > 0)}, false);
    } else {
      log.error("DB returned an error: %s", err);
      socket.emit("output", "There was an error issuing the query: " + err, true);
    }

    dbWrapper.close(function (close_err) {
      log.debug("Disconnected from server.");
      if (close_err) {
        log.error("Error while disconnecting: %s", close_err);
      }
    });
  });
}

function testDbConnection() {
  log.debug("Testing DB connection.");
  var dbWrapper = new DBWrapper('pg', dbConnectionConfig);
  dbWrapper.connect(function (state) {
    if ((state && state.name === "error") || (state && state.errno != null)) {
      log.error("Could not connect to the DB: %s", state.message);
      canConnect = false;
    } else {
      log.debug("DB connection successful, allowing future attempts.");
      canConnect = true;
    }

    if (dbWrapper.isConnected()) {
      dbWrapper.close(function (err) {
        log.debug("Disconnected from DB.");
        if (err) {
          log.error("Error while disconnecting from DB: %s", err);
        }
      })
    }
  });
}