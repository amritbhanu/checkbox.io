var redis = require('redis')
var multer  = require('multer')
var http      = require('http');
var httpProxy = require('http-proxy');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var client = redis.createClient(6379, "34.210.23.153", {})

var proxy   = httpProxy.createProxyServer();

http.createServer(function (req, res) {

    loadBalance (req, res)

}).listen(5000);

function loadBalance (req, res) {

    client.rpoplpush('proxy','proxy', function(err, reply)
    {
        client.lindex('proxy', 0, function(err, ip)
        {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open( "GET", 'http://' + ip + ':3003/stats', false ); // false for synchronous request
            xmlHttp.send( null );
            console.log(parseInt(xmlHttp.responseText));
            if (parseInt(xmlHttp.responseText) <= 15) {
                target = 'http://' + ip+ ':3003';
                console.log('target is: %s', target);
                proxy.web(req, res,
                {
                    target: target
                });
            } else {
                console.log (ip + ' is on heavy load');
                loadBalance (req, res);
            }
        });
    });
}

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


//
// Create your server that makes an operation that waits a while
// and then proxies the request
//



