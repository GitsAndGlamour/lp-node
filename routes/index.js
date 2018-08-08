var express = require('express');
var router = express.Router();
var request = require('request');
var WebSocket = require('ws');
var ws;

/* GET home page. */
router.get('/', function(req, res, next) {
    retrieveJwtToken(connectToMessagingService);
});

/**
 * retrieveJwtToken
 *
 * Retrieve JWT Token from LivePerson,
 * and extract the JWT value from the json response.
 *
 * returns string - JWT Token
 */
function retrieveJwtToken(callback) {
    var url = 'https://va.idp.liveperson.net/api/account/13350576/signup';
    request.post(url, function (err, res, body) {
        if (err) { throw err; }
        var json = JSON.parse(body);
        var jwt = json['jwt'];
        callback(jwt);
    });
}

/**
 * connectToMessagingService
 *
 * Open Websocket connection to LivePerson Messaging
 * Service using a JWT Token.
 *
 * @param token - string
 *
 * returns void
 */
function connectToMessagingService(token) {
    var url = 'wss://va.msg.liveperson.net/ws_api/account/13350576/messaging/consumer?v=3';
    var options = {
        headers: {
            "Authorization" : "JWT " + token
        }
    };

    ws = new WebSocket (url, options);
    ws.on('open', function open() {
        console.log("LivePerson Messaging Service WebSocket opened", new Date().toISOString());

        createNewConversation();

        ws.onmessage = function (event) {
            var object = JSON.parse(event.data);
            var conversationId = object.body['conversationId'];
            if (conversationId) {
                publishTextMessage(conversationId);
            }
        };

        ws.on('close', function close() {
            console.log("LivePerson Messaging Service WebSocket disconnected", new Date().toISOString());
        });
    });
}

/**
 * createNewConversation
 *
 * Requests a new conversation by sending the
 * ConsumerRequestConversation type message request
 * to the WebSocket.
 *
 * @param message
 *
 * returns string - ConversationId
 */
function createNewConversation() {
    console.log("Creating new conversation...");
    var message = {
        kind:"req",
        id:1,
        type:"cm.ConsumerRequestConversation"
    };

    ws.send(JSON.stringify(message), function ack(error) {
        if (error) console.log("WebSocket sending error: ", error);
    });
}

/**
 * publishTextMessage
 *
 * Publishes text message to a conversation.
 *
 * @param conversationId
 *
 * returns void
 */
function publishTextMessage(conversationId) {
    var content = 'Hello World!';
    console.log('Publishing text message: ' + content);
    var message = {
        kind:'req',
        id:2,
        type:'ms.PublishEvent',
        body:{
        dialogId: conversationId,
        event:{
            type: 'ContentEvent',
            contentType:'text/plain',
            message: content
            }
        }
    };
    ws.send(JSON.stringify(message), function ack(error) {
        if (error) console.log("WebSocket sending error: ", error);
    });
    ws.close();
}

module.exports = router;
