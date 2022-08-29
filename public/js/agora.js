let handleError = function (err) {
    console.log("Error: ", err);
};

// let channelName = localStream.getItem("channelName"), token = localStorage.getItem("token")
let channelName = "", token = ""
// getMeetingInfo()

async function getMeetingInfo(){

    let meeting_id = window.location.href.split("/");
    meeting_id = meeting_id[meeting_id.length-1];
    console.log('present')
    let response = await fetch('/call/get-meeting-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({"meeting_id": meeting_id})
    });
    
    let result = await response.json()

    if (result['error'] === "false"){
        console.log('result =', result)
        channelName = result['channelName'];
        token = result['token'];
    }
    else{
        alert("Something went wrong, Are you sure this is the correct meeting id?")
        throw new Error("ERROR")
    }
    socketWorks();
}

console.log(channelName, token)
let remoteContainer = document.getElementById("calls-wrapper");

async function startAgoraWork(){

    await getMeetingInfo();

// Add video streams to the container.
function addVideoStream(elementId) {
    console.log("CAMER HERE")
    let streamDiv = document.createElement("div");
    streamDiv.classList.add("person");
    streamDiv.id = elementId;
    streamDiv.style.transform = "rotateY(180deg)";
    remoteContainer.appendChild(streamDiv);
};


// Remove the video stream from the container.
function removeVideoStream(elementId) {
    let remoteDiv = document.getElementById(elementId);
    if (remoteDiv) remoteDiv.parentNode.removeChild(remoteDiv);
};


let client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8",
});

client.init("6d2f3453d8d4460b991c827610adc76b", async function () {
    console.log("client initialized");
}, function (err) {
    console.log("client init failed ", err);
});

let localStream;
client.join(
    token,
    channelName,
    null, (uid) => {
        localStream = AgoraRTC.createStream({
            audio: true,
            video: true,
        });

        // Initialize the local stream
        localStream.init(() => {
            localStream.play("me");

            client.publish(localStream, handleError);
        }, handleError);


    }, handleError);



// Subscribe to the remote stream when it is published
client.on("stream-added", function (evt) {
    client.subscribe(evt.stream, handleError);
});


// Play the remote stream when it is subsribed
client.on("stream-subscribed", function (evt) {
    let stream = evt.stream;
    let streamId = String(stream.getId());
    addVideoStream(streamId);
    stream.play(streamId);
});


// Remove the corresponding view when a remote user unpublishes.
client.on("stream-removed", function(evt){
    let stream = evt.stream;
    let streamId = String(stream.getId());
    stream.close();
    removeVideoStream(streamId);
});


// Remove the corresponding view when a remote user leaves the channel.
client.on("peer-leave", function(evt){
    let stream = evt.stream;
    let streamId = String(stream.getId());
    stream.close();
    removeVideoStream(streamId);
});

let camera_btn = document.getElementsByClassName("camera")[0]
let audio_btn = document.getElementsByClassName("mic")[0]
let call_end = document.getElementsByClassName("call-end")[0]

camera_btn.addEventListener("click", (e) => {
    if (localStream.isVideoOn()){
        camera_btn.children[0].classList.remove("bi-camera-video")
        camera_btn.children[0].classList.add("bi-camera-video-off")
        localStream.disableVideo();
    }else{
        camera_btn.children[0].classList.remove("bi-camera-video-off");
        camera_btn.children[0].classList.add("bi-camera-video");
        localStream.enableVideo();
    }
})

audio_btn.addEventListener("click", (e) => {
    if (localStream.isAudioOn()){
        audio_btn.children[0].classList.remove("bi-mic")
        audio_btn.children[0].classList.add("bi-mic-mute")
        localStream.disableAudio();
    }else{
        audio_btn.children[0].classList.remove("bi-mic-mute");
        audio_btn.children[0].classList.add("bi-mic");
        localStream.enableAudio();
    }
})


}



startAgoraWork()

