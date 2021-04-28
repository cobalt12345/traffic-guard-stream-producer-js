// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-central-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
// });

const REGION = 'eu-central-1';
const IDENTITY_POOL_ID = 'eu-central-1:25035041-4088-45af-80da-abdaf28f521b';
const KWS_NAME = 'traffic-guard';
const isInProduction = false;
const DATA_ENDPOINT = `https://wiexpnf9wf.execute-api.eu-central-1.amazonaws.com/${isInProduction ? 'Prod' 
    : 'Stage'}/process-webcam-stream/${KWS_NAME}/`;

const webcamConfig = {
    /*
    Previewer element size
     */
    width: 320,
    height: 240,
    /*
    File image size
     */
    dest_width: 640,
    dest_height: 480,
    /*
    JPEG
     */
    image_format: 'jpeg',
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
    flip_horiz: true,
    fps: 25,
    unfreeze_snap: true,
    upload_name: 'webcam'
};


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
    // $http.setRequestHeader("Content-Type", "application/json");
    // $http.setRequestHeader("Access-Control-Request-Method", "POST");
    // $http.setRequestHeader("Access-Control-Request-Headers", "Content-Type");
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