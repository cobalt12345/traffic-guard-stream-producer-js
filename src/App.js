import './App.css';
import {AmplifySignOut} from '@aws-amplify/ui-react';
import React from 'react';
import Webcam from "react-webcam";
import Amplify, {API, Auth} from 'aws-amplify';
import awsconfig from './aws-exports';
import {Button, Grid, LinearProgress} from '@material-ui/core';
import {withStyles} from '@material-ui/core/styles';
import piexif from 'piexifjs';

const useStyles = theme => ({
    root: {
        flexGrow: 1,

    },
    cameraPreview: {
    }
});

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
        this.setState((prevState, props) => {return {streamStarted: !prevState.streamStarted}});
    }

    componentDidMount() {
        this.timerId = setInterval(() => this.takeSnapshot(), 1000 / TARGET_FPS);
        Auth.currentAuthenticatedUser().then(user => console.debug(`Current authenticated user: ${JSON.stringify(user)}`))
    }

    takeSnapshot() {
        if (this.state.streamStarted) {
            let image = this.webcamRef.current.getScreenshot();
            let imageWithExif = null;
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const latitude = pos.coords.latitude;
                    const longitude = pos.coords.longitude;
                    const gps = {};
                    gps[piexif.GPSIFD.GPSLatitudeRef] = latitude < 0 ? 'S' : 'N';
                    gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(latitude);
                    gps[piexif.GPSIFD.GPSLongitudeRef] = longitude < 0 ? 'W' : 'E';
                    gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(longitude);
                    const exifData = piexif.load(image);
                    exifData.GPS = gps;
                    exifData.Exif[piexif.ExifIFD.LensMake] = 'TrafficGuardStreamProducerJS';
                    const exifBytes = piexif.dump(exifData);
                    this.imageWithExif = piexif.insert(exifBytes, image);
                },
                error => console.warn(error),
                {timeout: 1000 / TARGET_FPS});

            if (this.imageWithExif != null) {
                console.debug("Image with EXIF");
                this.frameBuffer.addFrame(this.imageWithExif);
            } else {
                console.debug("Image without EXIF");
                this.frameBuffer.addFrame(image);
            }

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
        const {classes} = this.props;

        return (
            <Grid
                className={classes.root}
                container
                direction="column"
                justify="flex-start"
                alignItems="center">
                <Grid item xs={12} spacing={3}>
                <Webcam className={classes.cameraPreview} id='streamingWebcam'
                            audio={false}
                            ref={this.webcamRef}
                            imageSmoothing = 'false'
                            videoConstraints={this.videoConstraints} screenshotFormat='image/jpeg'/>

                    {this.state.streamStarted ? <LinearProgress variant="indeterminate" color="secondary"/> : <div/>}
                </Grid>

                <Grid item xs={12} spacing={3}>
                    <Grid container>
                        <Button variant="contained" color="secondary" onClick={this.startStopStream}>
                            {(() => {return this.state.streamStarted ? 'Stop Streaming' : 'Start Streaming';})()}
                        </Button>
                        <AmplifySignOut/>
                    </Grid>
                </Grid>
            </Grid>);
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

export default withStyles(useStyles) (WebcamCapture);
