var config = {
  db:{
    host:"wub",
    database:"pgbench",
    username:"pgbench",
    password:"pgbench"
  },

  auth:{
    users:[
      {
        user:"michael",
        password:"30235ed7fcfdb1306b2440c7274b851743325f0770cbf9bad1cb105987dcdb8aba37bfc2c01067647f9296532c69d766a2e227fec165193e9ec772491db0bec2"
      }
    ]
  },

  port:9080,
  enableSsl:true,
  sslPort:443,
  sslKey:'private/ssl.key',
  sslCert:'private/ssl.crt'
}

module.exports = config;