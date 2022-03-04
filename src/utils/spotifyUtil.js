const SpotifyWebApi = require("spotify-web-api-node");
const { spotifyConfig } = require("../config.json");

module.exports = {
    init: (client) => {
        const spotifyApi = new SpotifyWebApi({
            clientId: spotifyConfig.clientId,
            clientSecret: spotifyConfig.clientSecret,
        });

        spotifyApi.clientCredentialsGrant().then(
            function(data) {
                console.log('Generated new access token! The access token expires in ' + data.body['expires_in']);

                spotifyApi.setAccessToken(data.body['access_token']);
            },
            function(err) {
                client.logManager.logMessage(`Failed to retrieve a spotify access token. Restart required!`);
                console.log('Something went wrong when retrieving an access token', err);
            }
        );


        return spotifyApi;
    }
}
