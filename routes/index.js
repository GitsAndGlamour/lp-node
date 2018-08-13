var express = require('express');
var router = express.Router();
var request = require('request');
var WebSocket = require('ws');
var fs = require('file-system');
var OAuth  =  require('oauth-1.0a');
var crypto = require('crypto');
var ws;

/* GET conversation and post first message. */
router.get('/', function(req, res, next) {
    retrieveJwtToken(connectToMessagingService);
});

router.get('/conversation', function(req, res, next)  {
   getConversation(res);
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
 * returns void
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

/**
 * getConversation
 *  This method retrieves a list of conversations with all their metadata and related messages.
 *
 * return object - Conversation metadata
 */
function getConversation(res) {
    var url = 'https://va.msghist.liveperson.net/messaging_history/api/account/13350576/conversations/conversation/search?v=2';
    var body = { conversationId: '3c026cc6-f1b8-4ddd-a24b-30068420d09c' };
    var oauth = OAuth({
        consumer: {
            key: '90dc82090ec74284a2ae8bd22e770642',
            secret: '5a62d04af7b9c39e'
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
    });

    var token  = {
        key: '39e1f5ef76194d1f80da029eff3c0e3c',
        secret: '40194cd29bf78514'
    };

    var options = {
        url: url,
        method: 'POST',
        data: body
    };

    request({
        url: options.url,
        method: options.method,
        form: oauth.authorize(options, token)
    }, function(error, response, body) {
        if (error) { console.log(error); res.send(error)}
        createFileFromJSON(body);
        res.send(response);
    });
}

/**
 * createFileFromJSON
 * Creates a .txt file using JSON Object
 *
 * @param obj
 *
 * return void
 */
function createFileFromJSON(obj) {
    fs.writeFile('output.txt', obj);
}

module.exports = router;
