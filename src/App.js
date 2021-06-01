import './App.css';
import {AmplifySignOut} from '@aws-amplify/ui-react';
import React from 'react';
import Webcam from "react-webcam";
import Amplify, {API, Auth} from 'aws-amplify';
import awsconfig from './aws-exports';

const TARGET_FPS = 5;
const FRAGMENT_DURATION_IN_FRAMES = 1 * TARGET_FPS;
const DATA_ENDPOINT = 'https://joqolrfd76.execute-api.eu-central-1.amazonaws.com/Stage';

Amplify.configure({
    ...awsconfig,
    API: {
        endpoints: [
            {
                name: "WebcamSnapshots2KvsApi",
                endpoint: DATA_ENDPOINT,
                custom_header: async () => {
                    //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    //!!!!!CORSE MUST BE ENABLED FOR API GATEWAY. OTHERWISE DOESN'T WORK!!!!!!!!!!!
                    //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

                    // The Access Token contains scopes and groups and is used to grant access to authorized resources.
                    //return { Authorization: `Bearer ${(await Auth.currentSession()).getAccessToken().getJwtToken()}` }
                    //The ID Token contains claims about the identity of the authenticated user such as name, email,
                    // and phone_number.
                    return { Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}` }
                }
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
            },
            streamStarted: false
        };
        this.switchFacingMode = this.switchFacingMode.bind(this);
        this.startStopStream = this.startStopStream.bind(this);
        this.webcamRef = React.createRef();
    };

    switchFacingMode(event) {

    }

    startStopStream() {
        this.setState({streamStarted: !this.state.streamStarted});
        let videoElement = document.querySelector('video')

    }

    componentDidMount() {
        this.timerId = setInterval(() => this.takeSnapshot(), 1000 / TARGET_FPS);
        Auth.currentAuthenticatedUser().then(user => console.debug(`Current authenticated user: ${JSON.stringify(user)}`))
    }

    takeSnapshot() {
        if (this.state.streamStarted) {
            let image = this.webcamRef.current.getScreenshot();
            this.frameBuffer.addFrame(image);
            if (this.frameBuffer.getSize() >= this.frameBuffer.bufferSize) {
                let fragment = this.frameBuffer.getData();
                this.frameBuffer.clear();
                //postFrameData(fragment, DATA_ENDPOINT);
                postFrameDataWithAuth(fragment);
            }
        }

        async function postFrameDataWithAuth(fragment) {
            const apiName = 'WebcamSnapshots2KvsApi';
            const path = '/streams';
            const myInit = {
                body: fragment, // replace this with attributes you need
                headers: {
                    "Content-Type": "application/json"
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
                            imageSmoothing = 'false'
                            videoConstraints={this.videoConstraints} screenshotFormat='image/png'/>
                </div>
                <div>
                    <button onClick={this.startStopStream}>
                        {(() => {return this.state.streamStarted ? 'Stop Streaming' : 'Start Streaming';})()}
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

export default WebcamCapture;
