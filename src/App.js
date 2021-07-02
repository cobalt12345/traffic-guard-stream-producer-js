import './App.css';
import Amplify, {Auth} from 'aws-amplify';
import awsconfig from './aws-exports';
import {withStyles} from '@material-ui/core/styles';
import WebcamCapture from "./WebcamCapture";

const useStyles = theme => ({
    root: {

        },
    cameraPreview: {

    },
    videoContainer: {
    }
});

export const TARGET_FPS = 5;
export const FRAGMENT_DURATION_IN_FRAMES = 1 * TARGET_FPS;
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

export default withStyles(useStyles) (WebcamCapture);
