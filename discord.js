/*
 * Discord N3DS
 * (c) Joshua Kelly, 2016.
 */

window.Discord = {
	token: "MjE3NjQxNzM4NzgzNjg2NjU3.CtmaGA.u-AQfWpgcsY82S_JJcvMwgUu81M",
	conn: undefined,
	seq: 0,
	heartbeat: undefined,
	heartbeatInterval: undefined,
	guilds: undefined,
	currentGuild: undefined,
	currentChannel: undefined
};

function discordLogin(email, password) {
	// Todo: POST {email:"email", password:"password"} to /api/auth/login and get token
}

if (window.MozWebSocket) {
	window.WebSocket = window.MozWebSocket;
}

function discordIdentify() {
	initData = {
		"op": 2,
		"d": {
			"token": window.Discord.token,
			"v": 3,
			"compress": false,
			"properties": {
				"$os": "Discord N3DS",
				"$browser": "Discord N3DS",
				"$device": "Discord N3DS",
				"$referrer": "Discord N3DS",
				"$referring_domain": "Discord N3DS"
			}
		}
	};
	window.Discord.conn.send(JSON.stringify(initData));
}

function appendChat(data) {
	chat = document.getElementById("channel"+data.d.channel_id);
	
	messageTemplateScript = document.getElementById("messageTemplate").innerHTML;
	messageTemplate = Handlebars.compile(messageTemplateScript);
	
	messageObject = data.d;
	messageObject.parsedContent = micromarkdown.parse(twemoji.parse(messageObject.content));
	
	html = messageTemplate(messageObject);
	chat.insertAdjacentHTML('afterbegin', html);
}

function appendChatRaw(element) {
	chat = document.getElementById("messages");
	chat.appendChild(element);
}

function appendChatInfo(message) {
	msgEl = document.createElement("p");
	msgEl.innerHTML = '[info] '+ message;
	appendChatRaw(msgEl);
}

function discordHeartbeat() {
	/* Send heartbeat to Discord */
	data = {
		"op": 1,
		"d": window.Discord.seq
	};
	window.Discord.conn.send(JSON.stringify(data));
	console.info('[Discord N3DS] Heartbeat; seq:', data.d);
}

function gameName(name) {
	/* This doesn't work afaik */
	data = {
		"op": 3,
		"d": {
			"idle_since": null,
			"game": {
				"name": name
			}
		}
	};
	window.Discord.conn.send(JSON.stringify(data));
	console.info('[Discord N3DS] Game name set to', name);
}

function switchChannel(id) {
	if(window.Discord.currentChannel !== undefined) {
		document.getElementById("channel"+window.Discord.currentChannel).style.display = 'none';
	}
	document.getElementById("channel"+id).style.display = 'block';
	window.Discord.currentChannel = id;
}

function switchGuild(id) {
	console.info(id);
	if(window.Discord.currentGuild !== undefined) {
		document.getElementById("guild"+window.Discord.currentGuild).style.display = 'none';
	}
	document.getElementById("guild"+id).style.display = 'block';
	window.Discord.currentGuild = id;
	
	switchChannel(guilds[id].channels[0].id);
	
	channelListTemplateScript = document.getElementById("channelListTemplate").innerHTML;
	channelListTemplate = Handlebars.compile(channelListTemplateScript);
	
	channels = {};
	for(var i = 0, len = guilds[id].channels.length; i < len; i++) {
		channel = guilds[id].channels[i];
		if(channel.type == "voice") continue;
		channels[channel.id] = channel;
	}
	document.getElementById("channelList").innerHTML = channelListTemplate({channels:guilds[id].channels});
}

function discordReady(data) {
	/* Start heartbeat */
	window.Discord.heartbeat = setInterval(discordHeartbeat, window.Discord.heartbeatInterval);
	console.info("[Discord N3DS] Ready! Heartbeat interval:", window.Discord.heartbeatInterval);
	gameName('Discord N3DS');
	
	/* Setup guilds and channels, yayyyyy */
	guilds = {};
	for(var i = 0, len = data.d.guilds.length; i < len; i++) {
		guild = data.d.guilds[i];
		guilds[guild.id] = guild;
	}
	
	window.Discord.guilds = guilds;
	
	guildListTemplateScript = document.getElementById("guildListTemplate").innerHTML;
	guildListTemplate = Handlebars.compile(guildListTemplateScript);
	
	messagesTemplateScript = document.getElementById("messagesTemplate").innerHTML;
	messagesTemplate = Handlebars.compile(messagesTemplateScript);
	
	document.getElementById("guildList").innerHTML = guildListTemplate({guilds:guilds});
	document.getElementById("messages").innerHTML = messagesTemplate({guilds:guilds});
	
	switchGuild(data.d.guilds[0].id);
}

function openConnection() {
	if(window.Discord.conn === undefined || window.Discord.conn.readyState === undefined || window.Discord.conn.readyState > 1) {
		window.Discord.conn = new WebSocket("wss://gateway.discord.gg/?encoding=json&v=5");
		window.Discord.conn.onopen = function() {
			console.info("[Discord N3DS] Socket opened");
			appendChatInfo("Socket opened");
			discordIdentify();
		};
		
		window.Discord.conn.onmessage = function(event) {
//			console.log(event.data);
			message = JSON.parse(event.data);
			console.log(message);
			
			window.Discord.seq = message.s;
			
			if(message.op == 10) {
				/* OP 10: Hello */
				window.Discord.heartbeatInterval = message.d.heartbeat_interval;
			} else if(message.t == "READY") {
				discordReady(message);
			} else if(message.t == "MESSAGE_CREATE") {
				appendChat(message);
			}
		};
		
		window.Discord.conn.onclose = function(event) {
			console.log("Socket closed.");
//			document.write("Socket closed.");
			appendChatInfo("[Discord N3DS] Socket closed.");
		};
	}
}

if(window.WebSocket === undefined) {
	alert("WebSockets are not available in your browser. Please use a more modern browser.");
} else {
	openConnection();
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}
