var redis = require('redis')
var multer  = require('multer')
var http      = require('http');
var httpProxy = require('http-proxy');
var client = redis.createClient(6379, "34.210.23.153", {})

var ports = {};
var proxy   = httpProxy.createProxyServer(ports);
var server1  = http.createServer(function(req, res)
{ 
  client.rpoplpush('proxy','proxy',function(err,value) 
  {
    if (err) throw err;
    proxy.web( req, res, {target: "http://0.0.0.0:3003" } );
    console.log("Redirecting to ip :"+value)
  })
});
console.log("Proxy server listening on port: 3000");
server1.listen(3000)