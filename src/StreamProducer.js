// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'eu-central-1'; // Region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//     IdentityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
// });
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
const {
    fromCognitoIdentityPool,
} = require("@aws-sdk/credential-provider-cognito-identity");
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
const REGION = 'eu-central-1';
let s3ClientConfig = {
    region: REGION,
    credentials: fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: REGION }),
        identityPoolId: 'eu-central-1:7779208d-624e-4741-9f76-42a18bbd9cae',
    }),
};
const client = new S3Client(s3ClientConfig);
let listBucketsCommand = new ListBucketsCommand({});

function listBuckets() {
    client.send(listBucketsCommand).then(
        (data) => {
            alert(data.Buckets);
        },
        (error) => {
            // const { requestId, cfId, extendedRequestId } = error.$metadata;
            // console.log({ requestId, cfId, extendedRequestId });
            console.log('Error', error);
        }
    );
}

// const listBucketsId = Symbol.for("listBuckets");
// window[listBucketsId] = listBuckets;
window.listBuckets = listBuckets;

window.hi = function() {
    alert('Hi');
}