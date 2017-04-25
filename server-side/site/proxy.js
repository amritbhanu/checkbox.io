var redis = require('redis')
var multer  = require('multer')
var http      = require('http');
var httpProxy = require('http-proxy');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var client=redis.createClient(6379, "34.210.23.153", {})

var proxy   = httpProxy.createProxyServer();

var cpuThreshold = 80;
//
// Create your server that makes an operation that waits a while
// and then proxies the request
//

http.createServer(function (req, res) {

    loadBalance (req, res)

}).listen(3000);

function getLoad (ip) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", 'http://' + ip + ':3003/stats', false ); // false for synchronous request
    xmlHttp.send( null );
    console.log(parseInt(xmlHttp.responseText));
    return parseInt(xmlHttp.responseText);
}

function loadBalance (req, res) {

    var reboot_length = client.llen('reboot');
    for (i = 0; i < reboot_length; i++) {
        client.rpop('reboot', function(err, ip)
        {
            var cpuLoad = getLoad(ip);
            if (cpuLoad <= cpuThreshold) {
                client.lpush('proxy', ip);
            } else {
                client.lpush('reboot', ip);
            }
        });
    }

    client.rpoplpush('proxy','proxy', function(err, ip)
    {
            cpuLoad = getLoad(ip);
            if (cpuLoad <= cpuThreshold) {
                target = 'http://' + ip+ ':3003';
                console.log('target is: %s', target);
                proxy.web(req, res,
                {
                    target: target
                });
            } else {
                console.log (ip + ' is on heavy load, removing it from production');
                client.lpop('proxy');
                client.lpush('reboot', ip);
                loadBalance (req, res);
            }
    });
}

// var server1  = http.createServer(function(req, res)
// { 
//   client.rpoplpush('proxy','proxy',function(err,value) 
//   {
//     if (err) throw err;
//     proxy.web( req, res, {target: "http://0.0.0.0:3003" } );
//     console.log("Redirecting to ip :"+value)
//   })
// });
// console.log("Proxy server listening on port: 3000");
// server1.listen(3000)






