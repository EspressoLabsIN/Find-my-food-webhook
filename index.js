'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const unirest = require('unirest');
const bodyParser = require('body-parser');
const server = express();
const radius = 10000;
const numberOfResults = 5;
const privateKey = fs.readFileSync('path to privkey file', 'utf8');
const certificate = fs.readFileSync('path to cert file', 'utf8');
const ca = fs.readFileSync('path to chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const httpsServer = https.createServer(credentials, server);

httpsServer.listen(8999, () => {
	console.log('HTTPS Server running on port 443');
});
const api_key = 'Your-Zomato-api-key';


let errorResposne = {
    results: []
};
server.use(bodyParser.json());
server.get('/',(req, res) => {
    console.log("HEY")
	res.send('Hello there !');
});
server.post('/FindResturant', (request, response) => {
   


    if(request.body.queryResult.action == 'findmyfood')
    {
        if(request.body.originalDetectIntentRequest.payload.device){
            var lat = request.body.originalDetectIntentRequest.payload.device.location.coordinates.latitude;
            var lon = request.body.originalDetectIntentRequest.payload.device.location.coordinates.longitude;
            var query = request.body.queryResult.parameters.cuisine;
            getRestuarantList(request, response, query, lat, lon);
        }
        else
        {
            var query = request.body.queryResult.parameters.cuisine;
            getLocation(request, response, query);
        }
    }
    else if(request.body.queryResult.action == 'storelocation')
    {
        if(request.body.originalDetectIntentRequest.payload.device){
            var lat = request.body.originalDetectIntentRequest.payload.device.location.coordinates.latitude;
            var lon = request.body.originalDetectIntentRequest.payload.device.location.coordinates.longitude;
            var query = request.body.originalDetectIntentRequest.payload.user.userStorage;
            getRestuarantList(request, response, query, lat, lon);
        }
        else
        {
            response.setHeader('Content-Type', 'application/json');
            response.send(JSON.stringify({
                "payload": {
                    "google": {
                        "expectUserResponse": false,
                        "richResponse": {
                            "items": [
                                {
                                    "simpleResponse": {
                                        "textToSpeech": "Sorry, I can not find restaurants near you without your location."
                                    }
                                }
                            ]
                            }
                        }
                      }
                }));
        }
    }
    else if(request.body.queryResult.action == 'resturantinfo')
    {
        var lat = request.body.originalDetectIntentRequest.payload.device.location.coordinates.latitude;
        var lon = request.body.originalDetectIntentRequest.payload.device.location.coordinates.longitude;
        var query = request.body.queryResult.parameters.restaurant;
        getRestuarantInfo(request, response, query, lat, lon);
    }
});

function getRestuarantList(request, response, query, lat, lon){
    var req = unirest("GET", "https://developers.zomato.com/api/v2.1/search?sort=real_distance&order=asc&count="+numberOfResults+"&lat="+lat+"&lon="+lon+"&radius="+radius+"&q=" + query)
    req.header("Accept", 'application/json').header('user-key', api_key).end(function(res){
                if(res.error) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({
                        "payload": {
                            "google": {
                                "expectUserResponse": true,
                                "richResponse": {
                                    "items": [{
                                        "simpleResponse": {
                                            "textToSpeech": "Error. Can you try it again ? "
                                        }
                                    }]
                                }
                            }   
                        }
                    }));
                } 
                else if(res) {   
                    var restaurants = res.body.restaurants;
                    var resultAudio = 'You can eat ' + query + ' at ';
                    restaurants.forEach((result, index) => {
                        resultAudio = resultAudio + result.restaurant.name + ((numberOfResults - 1) == index ? '.' : ', ')
                    });
                    response.setHeader('Content-Type', 'application/json');
                    response.send(JSON.stringify({
                        "payload": {
                            "google": {
                                "expectUserResponse": true,
                                "richResponse": {
                                    "items": [{
                                        "simpleResponse": {
                                            "textToSpeech": resultAudio
                                        }
                                    }]
                                }
                            }   
                        }
                    }));
                }
            });
}

function getRestuarantInfo(request, response, query, lat, lon){
    var req = unirest("GET", "https://developers.zomato.com/api/v2.1/search?count=1&lat="+lat+"&lon="+lon+"&radius="+radius+"&q=" + query)
            req.header("Accept", 'application/json').header('user-key', api_key).end(function(res){
                if(res.error) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({
                        "payload": {
                            "google": {
                                "expectUserResponse": true,
                                "richResponse": {
                                    "items": [{
                                        "simpleResponse": {
                                            "textToSpeech": "Error. Can you try it again ? "
                                        }
                                    }]
                                }
                            }   
                        }
                    }));
                } 
                else if(res) {   
                    var restaurant = res.body.restaurants[0].restaurant;
                    var responseInfo = restaurant.name + " is located at " + restaurant.location.address + ", and average cost for two is " + restaurant.currency + restaurant.average_cost_for_two;
                    response.setHeader('Content-Type', 'application/json');
                    response.send(JSON.stringify({
                        "payload": {
                            "google": {
                                "expectUserResponse": false,
                                "richResponse": {
                                    "items": [{
                                        "simpleResponse": {
                                            "textToSpeech": responseInfo
                                        }
                                    }]
                                }
                            }   
                        }
                    }));
                }
            });
}

function getLocation(request, response, query){
    response.setHeader('Content-Type', 'application/json');
            response.send(JSON.stringify({
                "payload": {
                    "google": {
                        "expectUserResponse": true,
                        "richResponse": {
                            "items": [
                                {
                                    "simpleResponse": {
                                        "textToSpeech": "PLACEHOLDER"
                                    }
                                }
                            ]
                            },
                        "systemIntent" : {
                            "intent" : "actions.intent.PERMISSION", 
                            "inputValueData" : {
                                "@type": "type.googleapis.com/google.actions.v2.PermissionValueSpec",
                                "permissions" : [ "DEVICE_PRECISE_LOCATION" ], 
                                "optContext" : "To serve you better" 
                            }
                          }, 
                          "userStorage" : query
                        }
                      }
                }));
}

