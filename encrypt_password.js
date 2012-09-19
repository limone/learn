var program = require('commander');
var ih = require('insanehash').crypto;

program.password('Please type the password you want to encrypt: ', function(pass){
  console.log("The encrypted password is:\n%s", ih.skein(pass));
});