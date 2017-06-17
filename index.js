console.log('susi_tweetbot has started!');

var express = require('express');
var Twit = require('twit');
var request = require('request');
var http = require('http');

var app = express();
app.set('port', (process.env.PORT || 5000));
var heroku_deploy_url = (process.env.HEROKU_URL)||("https://susichatbot.herokuapp.com");

var T = new Twit({
	consumer_key: process.env.TWITTER_CK,
	consumer_secret: process.env.TWITTER_CS,
	access_token: process.env.TWITTER_AT,
	access_token_secret: process.env.TWITTER_ATS
});

function TwitterBot() {
	setInterval(function() { http.get(heroku_deploy_url); }, 1800000);
	var stream = T.stream('user');
	stream.on('tweet', tweetEvent);
	function tweetEvent(eventMsg) {
		console.log(eventMsg);
		var replyto = eventMsg.in_reply_to_screen_name;
		var text = eventMsg.text.substring(15);
		var from = eventMsg.user.screen_name;
		if (replyto === 'susi_tweetbot') {
			var queryUrl = 'http://api.asksusi.com/susi/chat.json?q=' + encodeURI(text);
			var message = '';
			request({
				url: queryUrl,
				json: true
			}, function (err, response, data) {
				if (!err && response.statusCode === 200) {
					message = data.answers[0].actions[0].expression;
				} else {
					message = 'Oops, Looks like Susi is taking a break, She will be back soon';
					console.log(err);
				}
				console.log(message);
				tweetIt('@' + from + ' ' + message);
			});
		}
	}

	stream.on('follow', followed);
	function followed(eventMsg) {
		console.log('Follow event !');
		var name = eventMsg.source.name;
		var screenName = eventMsg.source.screen_name;
		var x = Math.floor(Math.random()*1000);
		tweetIt('@' + screenName + ' Thank you for following me! Your lucky number is ' + x);
	}

	stream.on('direct_message', reply);
	function reply(directMsg) {
		if (directMsg.direct_message.sender_screen_name === 'susi_tweetbot') {
			return;
		}
		console.log('You receive a message!');
		console.log(directMsg);
		var queryUrl = 'http://api.susi.ai/susi/chat.json?q=' + encodeURI(directMsg.direct_message.text);
		var message = '';
		request({
			url: queryUrl,
			json: true
		}, function (err, response, data) {
			if (!err && response.statusCode === 200) {
				message = data.answers[0].actions[0].expression;
			} else {
				message = 'Oops, Looks like Susi is taking a break, She will be back soon';
				console.log(err);
			}
			sendMessage(directMsg.direct_message.sender_screen_name, message);
			console.log(message);
		});
	}

	function tweetIt(txt) {
		var tweet = {
			status: txt
		}
		T.post('statuses/update', tweet, tweeted);

		function tweeted(err, data, response) {
			if (err) {
				console.log('Something went wrong!');
				console.log(err);
			} else {
				console.log('Tweeted!');
			}
		}
	}

	function sendMessage(sender, txt) {
		var msg = {
			text: txt,
			screen_name: sender
		}
		T.post('direct_messages/new', msg, sent);

		function sent(err, data, response) {
			if (err) {
				console.log('Something went wrong!');
				console.log(err);
			} else {
				console.log('Message was sent!');
			}
		}
	}
}
app.listen(app.get('port'), function() {
	console.log('Running on port ', app.get('port'));
	TwitterBot();
});
