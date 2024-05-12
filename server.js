const { Client, GatewayIntentBits } = require('discord.js');
const { AudioPlayerStatus, createAudioPlayer, joinVoiceChannel, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const https = require('https');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = process.env.PREFIX || "bke ";
const token = process.env.TOKEN;
const defaultActivityMsg = process.env.ACTIVITY_MSG || 'ENGLISH MUSIC 24/7';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(defaultActivityMsg, { type: 'PLAYING' });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.toLowerCase().slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  const radioChannels = process.env.RADIO_CHANNELS ? JSON.parse(process.env.RADIO_CHANNELS) : {
    'English Channel Live': 'https://listen-msmn.sharp-stream.com/solarlow.mp3',
  };

  if (command === 'start') {
    const channelNames = Object.keys(radioChannels);
    const randomChannelName = channelNames[Math.floor(Math.random() * channelNames.length)];

    let playedChannel = args[0] in radioChannels ? radioChannels[args[0]] : radioChannels[randomChannelName];
    message.reply('Radio : ' + (args[0] || randomChannelName));

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Join a voice channel.');
    }

    try {
      const connection = await joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      https.get(playedChannel, (res) => {
        const resource = createAudioResource(res);
        player.play(resource);
      }).on('error', (err) => {
        console.error(err);
        connection.destroy();
      });
    } catch (err) {
      console.error(err);
      message.reply('Player error');
    }
  } else if (command === 'youtube') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('Go to a voice channel.');
    }

    const connection = await joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    const query = args.join(' ');
    await playYouTubeVideo(query, connection, message);
  }
});

async function playYouTubeVideo(query, connection, message) {
  try {
    const videos = await play.search(query, { limit: 1 });

    if (!videos || videos.length === 0) {
      return message.reply('Video not found.');
    }

    const video = videos[0];
    const stream = await play.stream(video.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();
    player.play(resource);

    connection.subscribe(player);
  } catch (err) {
    console.error(err);
    message.reply('Something is broken :c');
  }
}

client.login(token);
