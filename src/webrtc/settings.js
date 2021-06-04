import AWS from 'aws-sdk';

const settings = {
    region: 'eu-central-1',
    accessKeyId: null,
    secretAccessKey: null,
    sessionToken: null,
    endpoint: null,
    channelName: null,
}

/**
 * This file demonstrates the process of creating a KVS Signaling Channel.
 */

async function createSignalingChannel(configuration) {
    // Create KVS client
    const kinesisVideoClient = new AWS.KinesisVideo(configuration);

    // Get signaling channel ARN
    await kinesisVideoClient
        .createSignalingChannel({
            ChannelName: configuration.channelName,
        })
        .promise();

    // Get signaling channel ARN
    const describeSignalingChannelResponse = await kinesisVideoClient
        .describeSignalingChannel({
            ChannelName: configuration.channelName,
        })
        .promise();
    const channelARN = describeSignalingChannelResponse.ChannelInfo.ChannelARN;
    console.log('[CREATE_SIGNALING_CHANNEL] Channel ARN: ', channelARN);

    return channelARN;
}
