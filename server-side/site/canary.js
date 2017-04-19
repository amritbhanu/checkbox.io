var express = require('express');
var proxy = require('http-proxy');
var app = express();
var apiProxy = proxy.createProxyServer();
var redis = require('redis');
var client = redis.createClient(6379, "", {});

var count = 0;
// var redirectAll = false;

client.on('connect', function(){
	//console.log("Redis Server is connected!!");
});

client.on('error', function(err){
	if(err) throw err;
});

function redirectProd (request, response){
  client.rpoplpush('pro', 'pro', function(err, server){
    if(err) throw err;
    count += 1;
    var prodIp = server;
    var url = 'http://' + prodIp + ':3003';
    // var url = server
    console.log('redirecting to :', url);
    count = count % 3;
    //response.status(200).send('Production!!\n');
    apiProxy.web(request, response, {target: url});
  });
}

function redirectCanary (request, response){
  client.rpoplpush('can', 'can', function(error, server){
    if(error) throw error;
    count += 1;
    var canaryIp = server;
    var url = 'http://' + canaryIp + ':3003';
    // var url = server;
    console.log('redirecting to: ', url);
    count =  count % 3;
    //response.status(200).send('Canary!!\n')
    apiProxy.web(request, response, {target: url});
  });
}


app.all('/*', function(req, res) {
  client.get('canaryAlert', function(error, alertValue){
    if (alertValue == 'true'){
      redirectProd(req, res);
    }
    else {
      if (count === 0)
        redirectCanary(req, res);
      else 
        redirectProd(req, res);
    }
  });
});


var proxyServer = app.listen('3001', function(){
	var host = proxyServer.address().address;
	var port = proxyServer.address().port;
});