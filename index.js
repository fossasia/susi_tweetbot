console.log('susi_tweetbot has started!');

var Twit = require('twit');
var config = require('./config');
var request = require('request');

var T = new Twit(config);

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
	var queryUrl = 'http://api.asksusi.com/susi/chat.json?q=' + encodeURI(directMsg.direct_message.text);
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
