# learn!

learn! is designed to be the simplest way to expose people to a specific technology.  Currently, learn! provides support for
talking to a PostgreSQL database.

### PostgreSQL
**available functionality**

1. Execute any SQL query that PostgreSQL supports
1. Type '\\l' to list all available tables
1. Type '\\u &lt;table name&gt;' to describe the structure of the specified table

### Notes
1. There is no error checking, yet.  If the user types in a faulty command, expect things to explode.
1. This started off as a fun project to help teach my wife to learn SQL without having to worry about using phpPgAdmin,
pgAdmin or any other random tool.  Don't expect much.
1. Here be dragons.

### Installation
**This app is based on node.js and socket.io - tested on OS X and Chrome.  No guarantees that anything else works.**

1. clone
1. npm install
1. edit app.js to point to your own PG DB
1. browse to http://localhost:9090/
1. fiddle!


### Contact
[Twitter](http://twitter.com/mlaccetti)
[email](mailto:m@lf.io?subject=learn)