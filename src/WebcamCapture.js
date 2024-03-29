import React from "react";
import {API} from "aws-amplify";
import piexif from "piexifjs";
import {Button, Grid, LinearProgress} from "@material-ui/core";
import Webcam from "react-webcam";
import {AmplifySignOut} from "@aws-amplify/ui-react";
import {createConsole} from "./inlineConsole";

export default class WebcamCapture extends React.Component {

    width = 1280;
    height = 720;

    videoConstraints = {
        width: {
            min: this.width
        },
        height: {
            min: this.height
        },
        facingMode:  'environment',
        resizeMode: 'none',
        screenshotQuality: 1,
        imageSmoothing: false,
        audio: false,
    }

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
            inlineConsoleVisible: false,
            dimension: {
                windowWidth: null,
                windowHeight: null
            }
        };
        this.switchFacingMode = this.switchFacingMode.bind(this);
        this.startStopStream = this.startStopStream.bind(this);
        this.positionChanged = this.positionChanged.bind(this);
        this.showHideConsole = this.showHideConsole.bind(this);
        this.takeSnapshot = this.takeSnapshot.bind(this);
        this.updateDimension = this.updateDimension.bind(this);
        this.webcamRef = React.createRef();
    };

    switchFacingMode(event) {

    }

    startStopStream() {
        this.setState((prevState, props) => {return {streamStarted: !prevState.streamStarted}});
    }

    componentDidMount() {
        if (navigator.permissions && navigator.permissions.query) {
            console.debug('Ask geolocation permission');
            navigator.permissions.query({name: 'geolocation'})
                .then(function (result) {
                    console.debug('Geolocation permission: ' + result.state);
                });
        } else {
            console.warn('No permission API');
        }
        this.timerId = setInterval(() => this.takeSnapshot(), 1000 / this.TARGET_FPS);
        // Auth.currentAuthenticatedUser().then(user => console.debug(`Current authenticated user: ${JSON.stringify(user)}`))
        this.positionHandler = navigator.geolocation.watchPosition(this.positionChanged, error => {
            console.error('Cannot get position: ' + error.code + " : " + error.message);
            alert(`${error.code}: ${error.message}`);
        }, {enableHighAccuracy: true});

        const inlinedConsole = createConsole();
        document.body.appendChild(inlinedConsole);
        console.debug('Created inline console: ' + inlinedConsole);
        const webcam = document.querySelector('#streamingWebcam');
        webcam ? webcam.addEventListener('dblclick', event => this.showHideConsole())
            : console.warn('Webcam element not found. Inline console cannot be attached.');

        //this.updateDimension();
        this.setState((prevState, props) => {
            return {dimension: {
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight
                }};
        });
        window.addEventListener('resize', this.updateDimension);
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
        navigator.geolocation.clearWatch(this.positionHandler);
        window.removeEventListener('resize', this.updateDimension);
    }

    updateDimension() {
        console.debug(`Set window dimension to: ${window.innerWidth}x${window.innerHeight}`);
        this.setState((prevState, props) => {
            return {dimension: {
                windowWidth: window.outerWidth,
                windowHeight: window.outerHeight
            }};
        });
    };

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
            let image = this.webcamRef.current.getScreenshot({width: this.width, height: this.height});
            if (null != this.state.exifWithGpsCoords) {
                let imageExtendedWithExif = piexif.insert(this.state.exifWithGpsCoords, image);
                if (imageExtendedWithExif) {
                    console.debug("Image with EXIF");
                    this.frameBuffer.addFrame(imageExtendedWithExif);
                } else {
                    console.debug("Image without EXIF");
                    this.frameBuffer.addFrame(image);
                }
            } else {
                console.debug("Image without EXIF");
                this.frameBuffer.addFrame(image);
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

        // const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        // if (supportedConstraints['facingMode']) {
        //     this.videoConstraints['facingMode'] = 'environment';
        // }
        const {classes} = this.props;

        return (
            <Grid
                className={classes.root}
                container
                spacing={1}
                direction="column"
                justify="center"
            >
                <Grid item xs={12}>
                    <Grid container direction="column">
                        <Grid item >
                            <Webcam className={classes.cameraPreview} id='streamingWebcam'
                                    audio={false}
                                    ref={this.webcamRef}
                                    imageSmoothing='false'
                                    videoConstraints={this.videoConstraints} screenshotFormat='image/jpeg'
                                // width={this.state.dimension.windowWidth - 50}
                                height={this.state.dimension.windowHeight - 100}
                            />
                        </Grid>
                        <Grid item >
                            {this.state.streamStarted ? <LinearProgress variant="indeterminate" color="secondary"/> : <div/>}
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={12}>
                    <Grid container direction="row" justify="center">
                        <Grid item xs={6} alignItems="flex-start">
                            <Button variant="contained" color="secondary" onClick={this.startStopStream}>
                                {(() => {
                                    return this.state.streamStarted ? 'Stop Streaming' : 'Start Streaming';
                                })()}
                            </Button>
                        </Grid>
                        <Grid item xs={6} alignItems="flex-start">
                            <AmplifySignOut/>
                        </Grid>
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