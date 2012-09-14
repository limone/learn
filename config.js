var config = {
  db:{
    host:"plop",
    database:"pgbench",
    username:"pgbench",
    password:"pgbench"
  },

  port:9080,
  enableSsl:true,
  sslPort:443,
  sslKey:'private/ssl.key',
  sslCert:'private/ssl.crt'
}

module.exports = config;