console.log('susi_tweetbot has started!');

var express = require('express');
var Twit = require('twit');
var request = require('request');
var http = require('http');

var app = express();
app.set('port', (process.env.PORT || 8080));

var T = new Twit({
	consumer_key: process.env.TWITTER_CK,
	consumer_secret: process.env.TWITTER_CS,
	access_token: process.env.TWITTER_AT,
	access_token_secret: process.env.TWITTER_ATS
});

function TwitterBot() {
	var stream = T.stream('user');
	createWelcomeMessage();

	stream.on('tweet', tweetEvent);
	function tweetEvent(eventMsg) {
		console.log(eventMsg);
		var replyto = eventMsg.in_reply_to_screen_name;
		var text = eventMsg.text.substring(9);
		var from = eventMsg.user.screen_name;
		var date = ' - ' + new Date().toISOString().slice(new Date().toISOString().indexOf('T')+1).replace(/\..+/, '');
		if (replyto === 'SusiAI1') {
			var queryUrl = 'http://api.asksusi.com/susi/chat.json?q=' + encodeURI(text);
			var message = '';
			request({
				url: queryUrl,
				json: true
			}, function (err, response, data) {
				if (!err && response.statusCode === 200) {
					if(data.answers[0].actions[1]){
						if(data.answers[0].actions[1].type === 'rss'){
							message += 'I found this on the web-:\n\n'
							for(var i=0;i<((data.answers[0].metadata.count)>50?50:data.answers[0].metadata.count);i++){
									message += ('Title : ');
									message += data.answers[0].data[i].title+', ';
									message += ('Link : ');
									message += data.answers[0].data[i].link+', ';
								message += '\n\n';
							}
						}
					}
					else{
						if(data.answers[0].actions[0].type === 'table'){
							var colNames = data.answers[0].actions[0].columns;
							if((data.answers[0].metadata.count)>50)
								message += 'Due to message limit, only some universities are shown-:\n\n';
							else
								message += 'Universities are shown below-:\n\n';
							for(var i=0;i<(((data.answers[0].metadata.count)>50)?50:data.answers[0].metadata.count);i++){
								for(var cN in colNames){
									message += (colNames[cN]+' : ');
									message += data.answers[0].data[i][cN]+', ';
								}
								message += '\n\n';
							}
						}
						else
						{
							message = data.answers[0].actions[0].expression;
						}
					}
				} 
				else {
					message = 'Oops, Looks like Susi is taking a break, She will be back soon';
					console.log(err);
				}
				console.log(message);

				if(message.length > 140){
					tweetIt('@' + from + ' Sorry due to tweet word limit, I have sent you a personal message. Check inbox'+date+"\nhttps://twitter.com/messages/compose?recipient_id=871446601000202244");
					sendMessage(from, message);
				}
				else{
					tweetIt('@' + from + ' ' + message + date +"\nhttps://twitter.com/messages/compose?recipient_id=871446601000202244");
				}
			});
		}
	}

	stream.on('follow', followed);
	function followed(eventMsg) {
		console.log('Follow event !');
		var name = eventMsg.source.name;
		var screenName = eventMsg.source.screen_name;
		if(screenName != 'SusiAI1'){
		var x = Math.floor(Math.random()*1000);
		var user_id1 = eventMsg.source.id_str;
		T.post('friendships/create', {user_id : user_id1},  function(err, tweets, response){
			if (err) {
				console.log('friendships/create ' + err);
				tweetIt('@' + screenName + ' Thank you for following me! Your lucky number is ' + x);
				console.log("----Couldn't follow back!");
				console.log(response);
			} 
			else {    
				tweetIt('@' + screenName + ' Thank you for following me! Your lucky number is ' + x + '.I followed you back, you can also direct message me now! ;)');
				console.log("----followed back!");
			} 
		});	
		}
	}

	stream.on('direct_message', reply);
	function reply(directMsg) {
		console.log('You receive a message!');
		if (directMsg.direct_message.sender_screen_name === 'SusiAI1') {
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
				if(data.answers[0].actions[1]){
					if(data.answers[0].actions[1].type === 'rss'){
						message += 'I found this on the web-:\n\n'
						for(var i=0;i<((data.answers[0].metadata.count)>50?50:data.answers[0].metadata.count);i++){
								message += ('Title : ');
								message += data.answers[0].data[i].title+', ';
								message += ('Link : ');
								message += data.answers[0].data[i].link+', ';
							message += '\n\n';
						}
					}
				}
				else{
					if(data.answers[0].actions[0].type === 'table'){
						var colNames = data.answers[0].actions[0].columns;
						if((data.answers[0].metadata.count)>50)
							message += 'Due to message limit, only some universities are shown-:\n\n';
						else
							message += 'Universities are shown below-:\n\n';
						for(var i=0;i<((data.answers[0].metadata.count)>50?50:data.answers[0].metadata.count);i++){
							for(var cN in colNames){
								message += (colNames[cN]+' : ');
								message += data.answers[0].data[i][cN]+', ';
							}
							message += '\n\n';
						}
					}
					else
					{
						message = data.answers[0].actions[0].expression;
					}
				}
			} 
			else {
				message = 'Oops, Looks like Susi is taking a break, She will be back soon';
				console.log(err);
			}
			sendEvent(directMsg.direct_message.sender.id_str, message);
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

	function createWelcomeMessage(){
		var queryUrl = 'http://api.asksusi.com/susi/chat.json?q=Welcome';
		var message = '';
		request({
			url: queryUrl,
			json: true
		}, function (err, response, data) {
			if (!err && response.statusCode === 200) {
				message = data.answers[0].actions[0].expression;
			}
			else{
				message = 'Oops, Looks like Susi is taking a break, She will be back soon';
				console.log(err);
			}
			var msg = {
  					"welcome_message" : {
					      "message_data": {
					        "text": message,
					        "quick_reply": {
					          "type": "options",
					          "options": [
					            {
					              "label": "Get started",
					              "metadata": "external_id_1"
					            },
					            {
					              "label": "Start chatting",
					              "metadata": "external_id_2"
					            }
					          ]
					        }
					      }
					    }
					  };
			T.post('direct_messages/welcome_messages/new', msg, sent);
			function sent(err, data, response) {
				if (err) {
					console.log('Something went wrong!');
					console.log(err);
				} else {
					console.log('Message was sent!\n');
					console.log(JSON.stringify(data)+'\n');
					
					// Making a welcome message rule
					var welcomeId = data.welcome_message.id;
					var welcomeRule = {
					  "welcome_message_rule": {
					    "welcome_message_id": welcomeId
					  }
					};

					T.post('direct_messages/welcome_messages/rules/new', welcomeRule, sent);
					
					function sent(err, data, response) {
						if (err) {
							console.log('Something went wrong!');
							console.log(err);
						} else {
							console.log('Message was sent!\n');
							console.log(JSON.stringify(data)+'\n');
						}
					}	
				}
			}
		});
	}

	function sendEvent(sender,txt) {
			var queryUrl = 'http://api.susi.ai/susi/chat.json?q='+'Share';
			var message = '';
			request({
				url: queryUrl,
				json: true
			}, function (err, response, data) {
				if (!err && response.statusCode === 200) {
					message = data.answers[0].actions[0].expression;
				}
				else{
					message = 'Oops, Looks like Susi is taking a break, She will be back soon';
					console.log(err);
				}
				var msg = {
		                  "event": {
		                    "type": "message_create",
		                    "message_create": {
		                      "target": {
		                        "recipient_id": sender
		                      },
		                      "message_data": {
		                        "text": txt,
		                        "ctas": [
		                          {
		                            "type": "web_url",
		                            "label": "Share with your followers",
		                            "url": "https://twitter.com/intent/tweet?text="+encodeURI("Reply by SUSI.AI - ")+encodeURI(txt)+"%0A"+encodeURI(message)+"%0Ahttps://twitter.com/SusiAI1"
		                          }
		                        ]
		                      }
		                    }
		                  }
		                };
					T.post('direct_messages/events/new', msg, sent);

					function sent(err, data, response) {
						if (err) {
							console.log('Something went wrong!');
							console.log(err);
						} else {
							console.log('Event was sent!');
						}
					}
				});
					
	}	
}
app.listen(app.get('port'), function() {
	console.log('Running on port ', app.get('port'));
	TwitterBot();
});
