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
var conString = "tcp://powerdns:powerdns2k10^^@plop/powerdns";
var client = new pg.Client(conString);
client.connect();

// Routes
app.get('/', routes.index);

app.listen(9090, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

io.sockets.on('connection', function (socket) {
    socket.on('sql', function (data) {
        console.log('Executing SQL statement: ' + data);

        var query = client.query(data);
        var rows = [];

        query.on('row', function(row) {
            rows.push(row);
        });

        query.on('end', function(result) {
            //fired once and only once, after the last row has been returned and after all 'row' events are emitted
            //in this example, the 'rows' array now contains an ordered set of all the rows which we received from postgres
            console.log(result.rowCount + ' rows were received');
            socket.emit('sql-output', rows);
        })
    });

    socket.on('list', function() {
        console.log("Listing available tables.");
        var query = client.query("select table_catalog, table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and is_insertable_into='YES' and table_schema not in ('pg_catalog', 'information_schema') order by table_name;");
        var rows = [];

        query.on('row', function(row) {
            rows.push(row);
        });

        query.on('end', function(result) {
            //fired once and only once, after the last row has been returned and after all 'row' events are emitted
            //in this example, the 'rows' array now contains an ordered set of all the rows which we received from postgres
            console.log(result.rowCount + ' rows were received');
            socket.emit('sql-output', rows);
        })
    });

    socket.on('describe', function(data) {
        var table = data.split(" ")[1];
        console.log("Describing the table structure of: " + table);

        var query = client.query("select table_catalog, table_schema, table_name, column_name, ordinal_position, column_default, is_nullable, data_type from INFORMATION_SCHEMA.COLUMNS where table_name = '" + table + "';")
        var rows = [];

        query.on('row', function(row) {
            rows.push(row);
        });

        query.on('end', function(result) {
            //fired once and only once, after the last row has been returned and after all 'row' events are emitted
            //in this example, the 'rows' array now contains an ordered set of all the rows which we received from postgres
            console.log(result.rowCount + ' rows were received');
            socket.emit('sql-output', rows);
        })
    });
});