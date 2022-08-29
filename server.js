require('dotenv').config()
const bcrypt = require('bcrypt');
const express = require("express");
const path = require("path");
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');
const createNewMeeting = require('./services/zcreatemeetings')

const harperCreateUser = require('./services/harperCreateUser');
const harperGetUser = require('./services/harperGetUser');
const harperSearchUser = require('./services/harperSearchUser');
const harperCreateNotification = require('./services/harperCreateNotification');
const harperGetNotifications = require('./services/harperGetNotifications');
const harperGetContacts = require('./services/harperGetContacts');
const harperUpdateContacts = require('./services/harperUpdateContacts');
const harperDeleteNotification = require('./services/harperDeleteNotification');
const harperCreateContactTemplate = require('./services/harperCreateContactTemplate');
const harperGetMeetings = require('./services/harperGetMeetings');
const harperCreateMeetingNotification = require('./services/harperCreateMeetingNotification');
const harperCreateMeeting = require('./services/harperCreateMeeting');
const harperGetMeetingInfo = require('./services/haperGetMeetingInfo.js');



const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;


app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))
app.use(express.static(path.join(__dirname, "public")));


let activeSockets = []
let activeUsers = {}

// socket work goes here

const channels = {};

function getAllUsers(channelName) {
    if(!channels[channelName]) return [];
    all_usernames = channels[channelName].map(s => s.username);
    // console.log(`all_usernames in channel ${channelName}`, all_usernames)
    return all_usernames;
}

function getSocket(channel, username) {
    sock = channels[channel].filter(s => s.username==username)[0];
    return sock;
}

io.on('connection', function(socket) {
    console.log('A user connected', socket.id);

    socket.on('join-channel', ({username, channel}) => {
        const other_users = getAllUsers(channel);
        socket.username = username;
        socket.channel = channel;
        if(!channels[channel]) channels[channel] = [socket];
        else channels[channel].push(socket);
        socket.join(channel);
        socket.broadcast.to(channel).emit("user-joined", username)
        socket.emit('other-users', other_users);
    })


    socket.on('invite-participants', async (participants) => {
        console.log('SERVER: client asked to request participants.')
        const nextMeetingId = await createNewMeeting();

        console.log('new meeting id', nextMeetingId)
        io.to(socket.id).emit('extend-meeting', {
            username: socket.username,
            nextMeetingId: nextMeetingId,
            originator: true
        })

        participants.forEach((p) =>  {
            let sock = getSocket(socket.channel, p);
            io.to(sock.id).emit('extend-meeting', {
                username: socket.username,
                nextMeetingId: nextMeetingId,
                originator: false
            })
        })
    })   

});

app.get("/", (request, response) => {
    response.sendFile(path.join(__dirname, "public", "register.html"))
})


app.get("/login", (request, response) => {
    response.sendFile(path.join(__dirname, "public", "login.html"))
})

app.post("/register-user", async (request, response) => {
    const {
        email,
        password1,
        password2
    } = request.body
    if (password1 !== password2) {
        return response.status(400).json({
            "error": "true",
            "s_message": "Passwords do not match."
        })
    }
    const hashedPassword = await bcrypt.hash(password1, process.env.PasswordSalt);

    let user_already_exists = false;

    await harperGetUser(email)
        .then((res) => {
            if (res) {
                user_already_exists = true;
                // return response.status(400).json({"error": "true", "s_message": "Username already exists. Try Logging in."})
            }
        })
        .catch((err) => console.log("ERROR =>", err));

    if (user_already_exists) {
        return response.status(400).json({
            "error": "true",
            "s_message": "Username already exists. Try Logging in."
        })
    }

    await harperCreateUser(email, hashedPassword)
        .then((res) => console.log(res))
        .catch((err) => console.log(err));

    await harperCreateContactTemplate(email)
        .catch((err) => console.log(err))

    return response.redirect('/login');
})

app.post("/login", async (request, response) => {
    const {
        email,
        password1
    } = request.body;
    console.log("EMAIL =>", email, password1)
    const hashedPassword = await bcrypt.hash(password1, process.env.PasswordSalt);

    let user_does_not_exists = false;

    let user;

    await harperGetUser(email)
        .then((res) => {
            if (!res) {
                user_does_not_exists = true;
            } else {
                user = res;
            }
        })
        .catch((err) => console.log("ERROR =>", err));


    if (user_does_not_exists) {
        return response.status(400).json({
            "error": "true",
            "s_message": "No account with this username exists."
        })
    }

    if (user['password'] != hashedPassword) {
        return response.status(400).json({
            "error": "true",
            "s_message": "Incorrect Password."
        })
    }

    return response.status(200).json({
        "error": "false",
        "s_message": "Login Successful"
    })
})

app.get("/people", (request, response) => {
    response.sendFile(path.join(__dirname, "public", "people.html"))
})

app.post("/find-people", async (request, response) => {
    const {
        username
    } = request.body;


    let search_result;
    await harperSearchUser(username)
        .then((res) => search_result = res)
        .catch((err) => console.log(err))

    return response.status(200).json({
        "error": "false",
        "s_message": search_result
    })

})

app.post("/invite", async (request, response) => {
    const {
        my_username,
        invite_username
    } = request.body;

    let notification_added_successfully = false;
    await harperCreateNotification(my_username, invite_username)
        .then((res) => {
            console.log("RES => ", res)
            notification_added_successfully = true;
        })
        .catch((err) => console.log(err))

    if (!notification_added_successfully) {
        return response.status(400).json({
            "error": "true",
            "s_message": "Something went wrong."
        })
    }

    // emit to the user
    return response.status(200).json({
        "error": "false",
        "s_message": "Notification sent successfully."
    })

})

app.get("/notifications", async (request, response) => {
    response.sendFile(path.join(__dirname, "public", "notifications.html"))
})

app.post("/get-notifications", async (request, response) => {

    const {
        username
    } = request.body

    let search_result;
    await harperGetNotifications(username)
        .then((res) => search_result = res)
        .catch((err) => console.log(err))

    return response.status(200).json({
        "error": "false",
        "s_message": search_result
    })
})

app.post("/get-meeting-notifactions", async(request, response)=> {


    const {
        username
    } = request.body

    let search_result;
    await harperGetMeetings(username)
        .then((res) => search_result = res)
        .catch((err) => console.log(err))

    return response.status(200).json({
        "error": "false",
        "s_message": search_result
    })
})

app.post("/accept-invitation", async (request, response) => {

    const {
        my_username,
        other_username
    } = request.body;
    let my_contacts, other_user_contacts;

    await harperGetContacts(my_username)
        .then((res) => my_contacts = res)
        .catch((err) => console.log(err))

    my_contacts = my_contacts[0];
    my_contacts = my_contacts['contacts'];

    await harperGetContacts(other_username)
        .then((res) => other_user_contacts = res)
        .catch((err) => console.log(err))

    other_user_contacts = other_user_contacts[0];
    other_user_contacts = other_user_contacts['contacts'];

    // push them into each others contact
    my_contacts.push(`${other_username}`);
    other_user_contacts.push(`${my_username}`);

    // creating in string form for harper request
    my_contacts_str = `[`;
    for (let i = 0; i < my_contacts.length; ++i) {
        my_contacts_str += `"${my_contacts[i]}",`
    }
    my_contacts_str = my_contacts_str.slice(0, -1);
    my_contacts_str += `]`;

    other_user_contacts_str = `[`;
    for (let i = 0; i < other_user_contacts.length; ++i) {
        other_user_contacts_str += `"${other_user_contacts[i]}",`
    }
    other_user_contacts_str = other_user_contacts_str.slice(0, -1);
    other_user_contacts_str += `]`;


    await harperUpdateContacts(my_username, my_contacts_str)
        .then((res) => console.log(res))
        .catch((err) => console.log(err))

    await harperUpdateContacts(other_username, other_user_contacts_str)
        .then((res) => console.log(res))
        .catch((err) => console.log(err))


    // delete notificaiton
    await harperDeleteNotification(my_username, other_username)
        .then((res) => console.log(res))
        .catch((err) => console.log(err))

    return response.status(200).json({
        "error": "false",
        "s_message": "Operations Successfull"
    })
})

app.post("/get-my-contacts", async (request, response) => {
    const {
        username
    } = request.body
    let my_contacts;
    await harperGetContacts(username)
        .then((res) => my_contacts = res)
        .catch((err) => console.log(err))

    return response.status(200).json({
        "error": "false",
        "s_message": my_contacts
    })
})

app.get("/create-meeting", (request, response) => {
    response.sendFile(path.join(__dirname, "public", "meeting.html"))
})

const nocache = (req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragme', 'no-cache');
    next();
}

const generateAccessToken = async (channel_name) => {


    // get channel name
    const channelName = channel_name;

    // get uid
    let uid = 0;

    // get role
    let role = RtcRole.PUBLISHER;

    // get expiry date
    let expireTime = 3600000;

    // privelege expire time
    const currentTime = Math.floor(Date.now()/1000);
    const privelegeExpireTime = currentTime + expireTime;

    // build token
    const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privelegeExpireTime);

    console.log('channelName:', channelName);

    // return token
    return token;
}



app.post("/create-meeting", async (request, response) => {
    let {username, duration, people} = request.body;
    console.log(username, duration, people[0])

    
    let random_str = randomString(10);
    let token = await generateAccessToken(random_str)

    const meetingid = randomString(10);

    await harperCreateMeeting(meetingid, random_str, token)
        .then((res) => console.log(res))
        .catch((e) => console.log(e))


    people.forEach(async(element) => {
        
        await harperCreateMeetingNotification(username, element, duration, meetingid)
            .then((res) => {console.log(res)})
            .catch((err) => {console.log(res)})
    });



    return response.json({
        "error": false,
        'meeting_id': meetingid
    })
})

app.post("/call/get-meeting-info", async (request, reponse) => {
    const {meeting_id} = request.body
    let result;
    await harperGetMeetingInfo(meeting_id)
        .then((res) => result = res)
        .catch((err) => console.log(err))

    if (result.length === 0) {
        return reponse.status(200).json({"error": "true"})
    }

    const {channelName, token} = result[0]
    
    return reponse.status(200).json({"error": "false", channelName, token})

})

app.get("/call/:meetingid", (request, response) => {
    console.log(request.params.meetingid)
    response.sendFile(path.join(__dirname, "public", "call.html"))
})



function randomString(length) {
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		   result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	 }
randomString(4);





http.listen(8000, () => {
    console.log("**********************************");
    console.log("Server running on Port 8000");
    console.log("***************************");
});