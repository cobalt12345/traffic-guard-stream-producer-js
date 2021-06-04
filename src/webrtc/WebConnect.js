import '../App.css';
import {AmplifySignOut} from '@aws-amplify/ui-react';
import React from 'react';
import Webcam from "react-webcam";
import Amplify, {API, Auth} from 'aws-amplify';
import awsconfig from '../aws-exports';
import {Button, Container, Grid, LinearProgress} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

const DATA_ENDPOINT = null;

const useStyles = theme => ({
    root: {
        flexGrow: 1,

    },
    cameraPreview: {
        width: '80%',
        height: '80%'
    }
});

Amplify.configure({
    ...awsconfig,
    API: {
        endpoints: [
            {
                name: "WebcamSnapshots2KvsApi",

                endpoint: DATA_ENDPOINT,
                custom_header: async () => {
                    return { Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}` }
                }
            }
        ]
    }
});

class WebConnect extends React.Component {

    render() {

        const {classes} = this.props;

        return (
            <Grid
                className={classes.root}
                container
                direction="column"
                justify="flex-start"
                alignItems="center">
                <Grid item xs={6} spacing={3}>
                    v class="col">
                    <h5>Master Section</h5>
                    <div class="video-container"><video class="local-view" autoplay playsinline controls muted /></div>
                </Grid>
                <Grid item xs={6} spacing={3}>
                    <h5>Viewer Return Channel</h5>
                    <div class="video-container"><video class="remote-view" autoplay playsinline controls /></div>
                </Grid>
                <Grid item xs={6} spacing={3}>
                    <h2>Viewer</h2>
                    <h5>Return Channel</h5>
                    <div className="video-container">
                        <video className="local-view" autoPlay playsInline controls muted/>
                    </div>
                </Grid>
                <Grid item xs={6} spacing={3}>
                    <h5>From Master</h5>
                    <div className="video-container">
                        <video className="remote-view" autoPlay playsInline controls/>
                    </div>
                </Grid>
            </Grid>

        );
    }
}

export default withStyles(useStyles) (WebConnect);