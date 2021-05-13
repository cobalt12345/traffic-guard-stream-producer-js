// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-central-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
// });
const TARGET_FPS = 25;
const DATA_ENDPOINT = `https://xyzzpzk0yf.execute-api.eu-central-1.amazonaws.com/Stage/streams`;

const webcamConfig = {
    /*
    Previewer element size
     */
    width: 480,
    height: 320,
    /*
    File image size
     */
    dest_width: 640,
    dest_height: 480,
    /*
    JPEG
     */
    image_format: 'png',
    /*
    From 0 to 100
     */
    jpeg_quality: 90,
    /*
    Try flash if camera is not accessible natively
     */
    enable_flash: true,
    /*
    Adobe Flash fallback mode
     */
    force_flash: false,
    /*
    Flip horiz.
     */
    flip_horiz: false,
    fps: TARGET_FPS,
    unfreeze_snap: true,
    upload_name: 'webcam'
};


var frameBuffer;


function startStreaming() {
    // Inititialize frame buffer.
    frameBuffer = new FrameBuffer({ size: TARGET_FPS });
    // Attempt to stream webcam feed to canvas element.
    Webcam.attach("#webcam-feed-container");
    // When webcam feed acquired, executes callback.
    Webcam.on('live', startStreamLoop);
}

var looperPromise;
function startStreamLoop() {
    let timerId = setInterval(() => Webcam.snap(frameCallback), 1000 / TARGET_FPS);
    looperPromise = timerId;
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
    $http.setRequestHeader("Content-Type", "text/plain");

    $http.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            console.log(`Sent images. Status: ${this.status} Response body: '${$http.responseText}'`);
        }
    };
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

