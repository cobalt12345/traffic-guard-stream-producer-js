// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-central-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
// });
const TARGET_FPS = 25;
const REGION = 'eu-central-1';
const IDENTITY_POOL_ID = 'eu-central-1:25035041-4088-45af-80da-abdaf28f521b';
const KVS_NAME = 'traffic-guard';
const isInProduction = false;
const DATA_ENDPOINT = `https://73sk5ixd4f.execute-api.eu-central-1.amazonaws.com/Stage/streams`;

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
    $http.setRequestHeader("Content-Type", "text/plain");

    $http.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            console.log(`Sent images. Status: ${this.status} Response body: '${$http.responseText}'`);
        }
    };
    $http.send(JSON.stringify(data));
    // const jsonData = JSON.stringify(data)
    // const authData = {
    // };
    // let apigClient = apigClientFactory.newClient(authData);
    // let params = {
    //     headers: {
    //         'Access-Control-Request-Method': 'POST',
    //         'Access-Control-Request-Headers': 'Content-Type, Accept',
    //         'Origin': 'http://localhost:63342/'
    //     },
    //     queryParams: {}
    // };
    // let body = {
    //     jsonData
    // };
    // var additionalParams = {
    //
    // };
    // apigClient.streamsPost(params, body, additionalParams).then((result) => {
    //     console.log(`Images were sent to the KVS. Result: ${result}`);
    // }).catch((error)=> {
    //     console.error(error);
    // })
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