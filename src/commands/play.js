const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { 
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require("yt-search");
const moment = require('moment');


module.exports = {
    name: 'play',
    description: 'Plays the audio of the youtube video.',
    aliases: ['p'],
    guildOnly: true,
    reqPerm: ['CONNECT'],
    args: true,
    usage: '<audio name or youtube video link>',
    async execute(message, args, prefix, client) {

        const url = args[0];
        const voiceChannel = message.member.voice.channel;

        if (!message.member.voice.channel) return client.func.embed('Please connect to a voice channel first.', message, { rM: false }, "reply", "blue");
        if(!voiceChannel.joinable) return client.func.embed(`I don't have the permission to join this voice channel!`, message, { rM: true }, "reply", "blue");
        let inVoiceChannel = message.guild.me.voice && message.guild.me.voice.channel;
        if(inVoiceChannel) {
            return client.func.embed('I am already in a voice channel and playing music.', message, { rM: true }, "reply", "blue")
        }
        let validate = ytdl.validateURL(url);
        if (!validate) {
            return await playYoutubeSearch(message, voiceChannel, args, client);
        } else {
            return await playYoutubeURL(message, voiceChannel, url, client);
        }

    }
    
}


/**
 * Streams the audio of the given youtube URL
 * @async
 * @param {object} message
 * @param {object} voiceChannel - User's voice channel
 * @param {string} url - URL of youtube video
 * @param {object} client
 */
async function playYoutubeURL(message, voiceChannel, url, client) {
    let songInfo;
    try {
        songInfo = await ytdl.getInfo(url);
    } catch (error) {
        if(error.statusCode === 410) {
            return client.func.embed(`This audio is not accessible.`, message, { rM: false }, "reply", "blue");
        } else {
            return client.func.embed(`Something went wrong. :confused:`, message, { rM: false }, "reply", "blue");
        }
    }

    if(!songInfo) return client.func.embed(`No results found!`, message, { rM: false }, "reply", "blue");
    if(songInfo.videoDetails.isLiveContent) return client.func.embed(`Youtube Live Streams not supported yet! We are working on this feature.`, message, { rM: true }, "reply", "blue");
    if(songInfo.videoDetails.age_restricted) return client.func.embed(`The result of this search is age-restricted!`, message, { rM: true }, "reply", "blue");


    //CONNECTION - assigning value to connection
    const conn = await client.connectToVC(voiceChannel, message);


    //PLAYER - Creates An Audio Player
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        },
    });


    const song = {...};
    const title = `[${song.title}](${song.url})`//TITLE

    
    //Status - Status Change Event
    player.on("stateChange", async (oldState, newState) => {
        if((oldState.status === AudioPlayerStatus.Idle || oldState.status === AudioPlayerStatus.Buffering) && newState.status === AudioPlayerStatus.Playing) {//Song Started
            const musicRow = new MessageActionRow()
            .addComponents(...);
            const reply = await client.func.embed(`<:YouTube:> | ${title} - \`(${song.audioLength})\``, message, { icon: song.thumbnail, rows: [musicRow], footer: { one: `Played by ${song.userTag}`, two: `${song.avatar}` }, title: `Now Playing`, rM: false }, "reply", "blue");

            musicRow.components[0].setDisabled(true);
            setTimeout(() => {
                try {
                    reply.edit({ components: [musicRow] });
                } catch (error) {
                    //
                }
            }, songInfo.videoDetails.lengthSeconds * 1000);

        } else if (newState.status === AudioPlayerStatus.Idle) {//Song Ended
            client.songs.delete(`${message.guild.id}-${song.id}`);
            client.func.embed(`Done Playing Music in ${message.guild.me.voice.channel}! <:tick:>`, message, false, "send", "blue");
            conn.destroy();
            player.stop();
        }
    });

    
    const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1<<25 });//Creating Stream Through YTDL
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });//Creating Audio Resource

    client.songs.set(`${message.guild.id}-${song.id}`, song);

    //Playing Resource On Player
    try {
        player.play(resource);
    } catch (error) {
        console.log('Error with playing in player');
        return client.logManager.logError(error, message, `player#play(resource) function in playYoutubeURL() function`);
    }
    //Subscribing To Player
    try {
        conn.subscribe(player);
    } catch (error) {
        console.log('Error with connection subscription');
        return client.logManager.logError(error, message, `conn.subscribe(player) function in playYoutubeURL() function`);
    }

}



/**
 * Streams the audio of the video that appears the highest in YouTube search of the given argument
 * @async
 * @param {object} message 
 * @param {object} voiceChannel - User's voice channel
 * @param {string} args - search query
 * @param {object} client 
 */
async function playYoutubeSearch(message, voiceChannel, args, client) {
    const targetSong = args.join(" ");

    //Searches For Videos On YouTube
    const videoSearch = async (query) => {
        const videoResult = await ytSearch(query);
        return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
    }

    const video = await videoSearch(targetSong);
    if(video) {
        return await playYoutubeURL(message, voiceChannel, video.url, client);
    } else {
        return client.func.embed(`No videos results found!`, message, false, "send", "blue");
    }

}
