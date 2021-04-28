// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-central-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
// });

const REGION = 'eu-central-1';
const IDENTITY_POOL_ID = 'eu-central-1:25035041-4088-45af-80da-abdaf28f521b';
const KWS_NAME = 'traffic-guard';
const DATA_ENDPOINT = `https://grt9g38s1i.execute-api.eu-central-1.amazonaws.com/Prod/process-webcam-stream/${KWS_NAME}/`;

var frameBuffer;


function startStreaming() {
    // Inititialize frame buffer.
    frameBuffer = new FrameBuffer({ size: 40 });
    // Attempt to stream webcam feed to canvas element.
    Webcam.attach("#webcam-feed-container");
    // When webcam feed acquired, executes callback.
    Webcam.on('live', startStreamLoop);
}

var looperPromise;
function startStreamLoop() {
    var TARGET_FPS = 10;
    var looper = function() {
        // Pass current frame image data to handler.
        Webcam.snap(frameCallback);
        looperPromise = setTimeout(looper, 1000 / TARGET_FPS);
    }
    looper();
}

function frameCallback(imgData) {
    // imgData is base64-encoded string of current frame
    // e.g. "data:image(jpeg|png);base64,----"; this is generated in WebcamJS library by calling
    // canvas.toDataURL('image/jpeg')
    frameBuffer.addFrame(imgData);
    if (frameBuffer.getSize() >= frameBuffer.bufferSize) {
        // Clear buffer, and post frames to data endpoint.
        var data = frameBuffer.getData();
        frameBuffer.clear();
        // DATA_ENDPOINT is API endpoint that handles conversion of image frame sequence to streamable MKV fragment.
        postFrameData(data, DATA_ENDPOINT);
    }
}

function postFrameData(data, endpoint, callback) {
    var $http = new XMLHttpRequest();
    $http.open("POST", endpoint);
    $http.setRequestHeader("Content-Type", "application/json");

    $http.send(JSON.stringify(data));
}

function stopStreaming() {
    try {
        Webcam.reset();
        Webcam.off('live');
        clearTimeout(looperPromise);
        frameBuffer.clear();
    } catch(e) {
        console.error(e);
    }
}