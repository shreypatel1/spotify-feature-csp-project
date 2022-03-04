const { spotifyConfig } = require("../../config.json");
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { 
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const SpotifyWebApi = require("spotify-web-api-node");
const SpotifyToYoutube = require("spotify-to-youtube");


module.exports = {
    name: 'spotify',
    description: "plays music from spotify",
    guildOnly: true,
    reqPerm: ['CONNECT'],
    args: true,
    usage: "<song/playlist/album> <name>",
    async execute(message, args, prefix, client) {
        
        const type = args[0];
        const query = args.slice(1).join(" ");
        const voiceChannel = message.member.voice.channel;

        if (!message.member.voice.channel) return client.func.embed('Please connect to a voice channel first.', message, { rM: false }, "reply", "green");
        if(!voiceChannel.joinable) return client.func.embed(`I don't have the permission to join this voice channel!`, message, { rM: true }, "reply", "green");
        let inVoiceChannel = message.guild.me.voice && message.guild.me.voice.channel;
        if(inVoiceChannel) {
            return client.func.embed('I am already in a voice channel and playing music.', message, { rM: true }, "reply", "green")
        }

        if(type === "playlist") {
            spotifyPlaylist(message, voiceChannel, query, client);
        } else {
            return;
        }
    }

}


/*
//Playlist
*/
async function spotifyPlaylist(message, voiceChannel, query, client) {

    if(!query) return message.func.embed(`Please provide the name of the playlist.`, message, { rM: false }, "reply", "green");
    /*
    //Searching Playlist
    */
    const queryResult = await client.spotifyApi.searchPlaylists(query, { limit: 1 });


    //Gets Playlist Info
    const playlistInfo = queryResult.body.playlists.items[0];
    if(!playlistInfo) return client.func.embed(`No results found!`, message, { rM: false }, "reply", "green");
    /*
    //Getting Playlist
    */
    const playlist = await client.spotifyApi.getPlaylist(playlistInfo.id)

    //Tracks data
    const tracks = playlist.body.tracks.items;
    if(!tracks) return client.func.embed(`This playlist has no tracks in it!`, message, { rM: false }, "reply", "green");


    //spotifyToYoutube
    const spotifyToYoutube = SpotifyToYoutube(client.spotifyApi);

    //Song array
    let songURLs = [];
    tracks.forEach(async (song) => {
        const id = await spotifyToYoutube(song.track);
        //`https://youtu.be/${id}`
        songURLs.push(`https://youtu.be/${id}`);
    });


    try {
        playQueue(message, voiceChannel, songURLs, client);
    } catch (error) {
        client.logManager.logError(error, message, `playQueue() function in spotify.js`);
    }

};


/*
//Playling Queue
*/
async function playQueue(message, voiceChannel, songURLs, client) {
    client.queue.get();
    const conn = await client.connectToVC(voiceChannel, message);
};
