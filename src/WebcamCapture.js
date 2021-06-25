import React from "react";
import {API, Auth} from "aws-amplify";
import piexif from "piexifjs";
import {Button, Grid, LinearProgress} from "@material-ui/core";
import Webcam from "react-webcam";
import {AmplifySignOut} from "@aws-amplify/ui-react";

export default class WebcamCapture extends React.Component {

    videoConstraints = {
        width: 640,
        height: 480,
    };

    constructor(props) {
        super(props);
        this.frameBuffer = new FrameBuffer({size: props['bufferSize']});
        this.TARGET_FPS = props['target_fps'];
        this.state = {
            facingMode: {
                exact: 'environment'
            },
            streamStarted: false,
            exifWithGpsCoords: null,
            inlineConsoleVisible: false
        };
        this.switchFacingMode = this.switchFacingMode.bind(this);
        this.startStopStream = this.startStopStream.bind(this);
        this.positionChanged = this.positionChanged.bind(this);
        this.showHideConsole = this.showHideConsole.bind(this);

        this.webcamRef = React.createRef();
    };

    switchFacingMode(event) {

    }

    startStopStream() {
        this.setState((prevState, props) => {return {streamStarted: !prevState.streamStarted}});
    }

    componentDidMount() {
        this.timerId = setInterval(() => this.takeSnapshot(), 1000 / this.TARGET_FPS);
        // Auth.currentAuthenticatedUser().then(user => console.debug(`Current authenticated user: ${JSON.stringify(user)}`))
        this.positionHandler = navigator.geolocation.watchPosition(this.positionChanged, error => {
            console.error('Cannot get position: ' + error.code + " : " + error.message);
            alert(`${error.code}: ${error.message}`);
        });

    }

    componentWillUnmount() {
        clearInterval(this.timerId);
        navigator.geolocation.clearWatch(this.positionHandler);
    }

    positionChanged(pos) {
        console.debug('Position changed: ' + pos);
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const gps = {};
        gps[piexif.GPSIFD.GPSLatitudeRef] = latitude < 0 ? 'S' : 'N';
        gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(latitude);
        gps[piexif.GPSIFD.GPSLongitudeRef] = longitude < 0 ? 'W' : 'E';
        gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(longitude);
        let newCoords = '';
        for (let prop in gps) {
            newCoords += ' '.concat(gps[prop]);
        }
        console.debug(`New GPS coordinates: ${newCoords}`);
        let exifData = {GPS: gps, Exif: {}};
        exifData.Exif[piexif.ExifIFD.LensMake] = 'TrafficGuardStreamProducerJS';
        const exifBytes = piexif.dump(exifData);
        this.setState((prevState, props) => {return {exifWithGpsCoords: exifBytes}});
    };

    takeSnapshot() {
        if (this.state.streamStarted) {
            let image = this.webcamRef.current.getScreenshot(this.videoConstraints);
            if (null != this.state.exifWithGpsCoords) {
                let imageExtendedWithExif = piexif.insert(this.state.exifWithGpsCoords, image);
                console.debug('Image with exif: ' + imageExtendedWithExif);
                if (imageExtendedWithExif) {
                    console.debug("Image with EXIF");
                    this.frameBuffer.addFrame(imageExtendedWithExif);
                } else {
                    console.debug("Image without EXIF");
                    this.frameBuffer.addFrame(image);
                }
            }
            if (this.frameBuffer.getSize() >= this.frameBuffer.bufferSize) {
                let fragment = this.frameBuffer.getData();
                this.frameBuffer.clear();
                //postFrameData(fragment, DATA_ENDPOINT);
                postFrameDataWithAuth(fragment).then(result => console.debug(`Sent fragment: ${result}`))
                    .catch(reason => console.warn(`Rejected fragment: ${reason}`));
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

        //next comment statement suppresses warning about unused function
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
    showHideConsole() {
        this.setState((prevState, props) => {
            let inlinedConsole = document.getElementById('consoleWrapper');
            if (prevState.inlineConsoleVisible) {
                inlinedConsole.setAttribute('hidden', 'true');
            } else {
                inlinedConsole.removeAttribute('hidden');
            }
            return {inlineConsoleVisible: !prevState.inlineConsoleVisible};
        });
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
                spacing={3}
                direction="column"
                justify="flex-start"
                alignItems="center">
                <Grid item xs={12}>
                    <Button variant='outlined' color='primary' size='small' onClick={this.showHideConsole}>
                        Console
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    <Webcam className={classes.cameraPreview} id='streamingWebcam'
                            audio={false}
                            ref={this.webcamRef}
                            imageSmoothing = 'false'
                            videoConstraints={this.videoConstraints} screenshotFormat='image/jpeg'/>

                    {this.state.streamStarted ? <LinearProgress variant="indeterminate" color="secondary"/> : <div/>}
                </Grid>

                <Grid item xs={12}>
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