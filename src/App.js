import logo from './logo.svg';
import './App.css';
import {withAuthenticator, AmplifySignOut} from '@aws-amplify/ui-react';
import React from 'react';
import Webcam from "react-webcam";
import Amplify, { API, Auth } from 'aws-amplify';

const TARGET_FPS = 5;
const FRAGMENT_DURATION_IN_FRAMES = 1 * TARGET_FPS;
const DATA_ENDPOINT = 'https://c5tf9yq958.execute-api.eu-central-1.amazonaws.com/Stage/streams';

Amplify.configure({
    aws_cloud_logic_custom:  [
        {
            name: "WebcamSnapshots2KvsApi", // (required) - API Name (This name is used used in the client app to identify the API - API.get('your-api-name', '/path'))
            endpoint: "https://c5tf9yq958.execute-api.eu-central-1.amazonaws.com/Stage", // (required) -API Gateway URL + environment
            region: "us-east-1" // (required) - API Gateway region
        }
    ],
    Auth: {
        // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
        identityPoolId: 'eu-central-1:da8e19ba-c960-4b04-8d21-9ac133178468',
        // REQUIRED - Amazon Cognito Region
        region: 'eu-central-1',
        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: 'eu-central-1_AQvwBH8Uw',
        // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: '1qe5qlivb2cep1pptt38t80en2',
        mandatorySignIn: true,
        authenticationFlowType: 'USER_PASSWORD_AUTH'
    },
    API: {
        endpoints: [
            {
                name: 'WebcamSnapshots2KvsApi',
                endpoint: "https://c5tf9yq958.execute-api.eu-central-1.amazonaws.com/Stage"
            }
        ]
    }
});

class WebcamCapture extends React.Component {
    frameBuffer = new FrameBuffer({size: FRAGMENT_DURATION_IN_FRAMES});

    videoConstraints = {
        width: 640,
        height: 480,
    };

    constructor(props) {
        super(props);
        this.state = {
            facingMode: {
                exact: 'environment'
            }
        };
        this.switchFacingMode = this.switchFacingMode.bind(this);
        this.webcamRef = React.createRef();
    };

    switchFacingMode(event) {

    }

    componentDidMount() {
        this.timerId = setInterval(() => this.takeSnapshot(), 1000 / TARGET_FPS);
    }

    takeSnapshot() {
        let image = this.webcamRef.current.getScreenshot();
        this.frameBuffer.addFrame(image);
        if (this.frameBuffer.getSize() >= this.frameBuffer.bufferSize) {
            let fragment = this.frameBuffer.getData();
            this.frameBuffer.clear();
            //postFrameData(fragment, DATA_ENDPOINT);

            postFrameDataWithAuth(fragment);
        }

        async function postFrameDataWithAuth(fragment) {
            const apiName = 'WebcamSnapshots2KvsApi';
            const path = '/streams';
            const myInit = {
                body: JSON.stringify(fragment), // replace this with attributes you need
                headers: {
                    "Content-Type": "text/plain"
                }
            };
            return await API.post(apiName, path, myInit);
        }

        function postFrameData(data, endpoint) {
            var $http = new XMLHttpRequest();
            $http.open("POST", endpoint);
            $http.setRequestHeader("Content-Type", "text/plain");

            $http.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    console.log(`Sent images. Status: ${this.status} Response body: '${$http.responseText}'`);
                }
            };
            try {
                $http.send(JSON.stringify(data));
            } catch(e) {
                console.error(e);
            }
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
    }

    render() {

        const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        if (supportedConstraints['facingMode']) {
            this.videoConstraints['facingMode'] = 'environment';
        }

        return (
            <div>
                <div>
                    <Webcam id='streamingWebcam'
                            ref={this.webcamRef}
                            videoConstraints={this.videoConstraints} screenshotFormat='image/png'/>
                </div>
                <div>
                    <button name='Switch Camera' onClick={this.switchFacingMode}>
                        Switch Camera
                    </button>
                </div>
                <div>
                    <AmplifySignOut/>
                </div>
            </div>);
    }

}

const FrameBuffer = function(params) {
    var that = Object.create(FrameBuffer.prototype);

    var MIN_BUFFER_SIZE = 1;
    var frameBuffer = [];
    var frameTimestamps = [];
    var bufferSize = Math.max(MIN_BUFFER_SIZE, params.size);
    that.bufferSize = bufferSize;
    var startTimestamp;
    var lastTimestamp;

    that.addFrame = function(imgData) {
        frameBuffer.push(imgData);
        startTimestamp = startTimestamp || new Date().getTime();
        lastTimestamp = new Date().getTime();
        frameTimestamps.push(lastTimestamp);
    };
    that.clear = function() {
        frameBuffer = [];
        frameTimestamps = [];
        startTimestamp = null;
    };
    that.shouldClear = function() {
        return frameBuffer.length >= bufferSize;
    };
    that.getData = function() {
        return {
            frames: frameBuffer.slice(),
            framerate: Math.round(1000 * frameBuffer.length / (lastTimestamp - startTimestamp)),
            timestamps: frameTimestamps.slice()
        }
    };
    that.getSize = function() {
        return frameBuffer.length;
    };

    Object.freeze(that);
    return that;
};

export default withAuthenticator(WebcamCapture);
