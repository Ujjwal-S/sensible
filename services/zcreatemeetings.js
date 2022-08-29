const harperCreateMeeting = require('./harperCreateMeeting');
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');

const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

async function createNewMeeting (){
    
    let random_str = randomString(10);
    let token = await generateAccessToken(random_str)

    const meetingid = randomString(10);

    await harperCreateMeeting(meetingid, random_str, token)
        .then((res) => console.log(res))
        .catch((e) => console.log(e))

    return meetingid;
}


const generateAccessToken = async (channel_name) => {
    const channelName = channel_name;
    let uid = 0;
    let role = RtcRole.PUBLISHER;
    let expireTime = 3600000;
    const currentTime = Math.floor(Date.now()/1000);
    const privelegeExpireTime = currentTime + expireTime;

    // build token
    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privelegeExpireTime);

    console.log('channelName:', channelName);

    // return token
    return token;
}


function randomString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }


module.exports = createNewMeeting;

