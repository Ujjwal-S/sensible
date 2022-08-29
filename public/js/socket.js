const participantsDiv = document.getElementsByClassName("participants")[0];

var socket = io();

function newlyInvitedParticipants() {
    return [...document.getElementsByClassName("participants")[0].querySelectorAll("input")].filter(e => e.checked).map(e => e.id)
}

function addParticipantToDOM(username) {
    let e = document.createElement("div");
                    e.classList.add("participant");
                    e.innerHTML = 
                    `
                    <img src="/images/person2.png" alt="person-img">
                    ${username}
                    <input type="checkbox" name="${username}" id="${username}">
                    `;
                    participantsDiv.append(e);
}

function inviteParticipants() {
    const participants = newlyInvitedParticipants();
    socket.emit('invite-participants', participants)
    console.log('CLIENT: sent request to invite participants to server.')
}

function socketWorks() {
    socket.emit('join-channel', {
        username: localStorage.getItem('username'),
        channel: channelName
    })

    socket.on("user-joined", (username) => {
        console.log('username joined: ', username)
        addParticipantToDOM(username);
    })

    socket.on('other-users', (other_users) => {
        other_users.forEach(username => {
            addParticipantToDOM(username);
        });
        console.log('CLIENT: server sent other users', other_users)
    })

    socket.on('extend-meeting', ({username, nextMeetingId, originator}) => {
        localStorage.removeItem("originator")
        localStorage.removeItem("nextMeeting")
        localStorage.removeItem("nextMeetingId")

        if(originator) {
            localStorage.setItem('originator', true)
            localStorage.setItem('nextMeeting', true)
            localStorage.setItem('nextMeetingId', nextMeetingId)
        } else {
            localStorage.setItem('originator', false)
            localStorage.setItem('nextMeeting', false)
            localStorage.setItem('nextMeetingId', nextMeetingId)

            if (window.confirm(`${username} wants to extend meeting with you, please confirm your response.`)) {
                localStorage.setItem('nextMeeting', true)
            }
        }

        console.log("USer ki position", originator, localStorage.getItem("nextMeeting"), nextMeetingId)
    })

}

