var redis = require('redis')
var multer  = require('multer')
var http      = require('http');
var httpProxy = require('http-proxy');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var client=redis.createClient(6379, "52.37.43.51", {})

var proxy   = httpProxy.createProxyServer();

var cpuThreshold = 80;
//
// Create your server that makes an operation that waits a while
// and then proxies the request
//

http.createServer(function (req, res) {

    if (req.url != '/favicon.ico')
        loadBalance (req, res);

}).listen(3000);

function getLoad (ip) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", 'http://' + ip + ':3003/stats', false ); // false for synchronous request
    xmlHttp.send( null );
    return parseInt(xmlHttp.responseText);
}

function loadBalance (req, res) {

    client.llen('reboot',function(err,result) {
        for(var i=0; i<result; i++) {
                client.rpop('reboot', function(err, ip)
                {
                        if (ip != null) {
                        var cpuLoad = getLoad(ip);
                        if (cpuLoad <= cpuThreshold) {
                                client.lpush('proxy', ip);
                        } else {
                                client.lpush('reboot', ip);
                        }}
                });
        }
    });

    client.rpop('proxy', function(err, ip)
    {
            cpuLoad = getLoad(ip);
            if (cpuLoad <= cpuThreshold) {
                target = 'http://' + ip+ ':3003';
                console.log('target is: %s', target);
                client.lpush('proxy',ip);
                proxy.web(req, res,
                {
                    target: target
                });
            } else {
                if (ip != null)
                {
                        console.log (ip + ' is on heavy load, removing it from production');
                        client.lpush('reboot', ip);
                        loadBalance (req, res);
                }
            }
    });

}