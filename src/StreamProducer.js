import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

let s3ClientConfig = {
    region: 'eu-central-1',
    credentials: {
        AccessKeyId: 'AKIAW2W76X6JUKKSZR5F1',
        SecretAccessKey: 'sacclyK+wZt8VYHEoo5jaQaX4K5mdfoR8+2s99jw1'
    }
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