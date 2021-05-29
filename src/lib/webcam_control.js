var cameraSelect = document.querySelector('select#videoSource');
cameraSelect.onchange = getStream;
getStream().then(getDevices).then(gotDevices);
function getDevices() {
    return navigator.mediaDevices.enumerateDevices();
}
function gotDevices(deviceInfos) {
    window.deviceInfo = deviceInfos;
    console.debug(`Available devices: ${deviceInfos}`);
    for (const deviceInfo of deviceInfos) {
        const optionEl = document.createElement('option');
        optionEl.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'videoinput') {
            optionEl.text = deviceInfo.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(optionEl);
        }
    }
}

function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }
    const videoSource = cameraSelect.value;
    const constraints = {
        video: {deviceId: videoSource ? {exact: videoSource} : undefined},
    };
    return navigator.mediaDevices.getUserMedia(constraints).
    then(gotStream).catch(handleError);
}

function gotStream(stream) {
    stream.getVideoTracks().forEach(videoTrack => {
        let videoTrackConstraints = videoTrack.getConstraints();
        try {
            videoTrackConstraints.facingMode = 'environment';
            videoTrack.applyConstraints(videoTrackConstraints);
        } catch(e) {
            console.error(`Can not set track facing mode. Error: ${e}`);
        }
    });
    window.stream = stream; // make stream available to console
    cameraSelect.selectedIndex = [...cameraSelect.options].
    findIndex(option => option.text === stream.getVideoTracks()[0].label);
    cameraSelect.srcObject = stream;
}

function handleError(error) {
    console.error('Error: ', error);
}