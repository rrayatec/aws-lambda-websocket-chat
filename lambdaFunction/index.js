const AWS = require('aws-sdk');

const client = new AWS.ApiGatewayManagementApi({
    endpoint: 'ID.execute-api.us-east-1.amazonaws.com/production',
});
const names = {}
const sendToOne = async (id, body) => {
    try {
        await client.postToConnection({
            'ConnectionId': id,
            'Data': Buffer.from(JSON.stringify(body)),
        }).promise();
    } catch (err) {
        console.error(err);
    }
};
const sendToAll = async (ids, body) => {
    const all = ids.map(i => sendToOne(i, body));
    return Promise.all(all)
};

exports.handler = async (event) => {
    if (event.requestContext) {
        const route = event.requestContext.routeKey;
        const connectionId = event.requestContext.connectionId;
        let body = {}
        try {
            if (event.body) {
                body = JSON.parse(event.body)
            }
        } catch (e) {
            console.log(e)
        }

        switch (route) {
            case '$connect':
                console.log('Nuevo cliente')
                break
            case '$disconnect':
                await sendToAll(Object.keys(names), { systemMessage: `${names[connectionId]} has left the chat` });
                delete names[connectionId];
                await sendToAll(Object.keys(names), { members: Object.values(names) });
                break
            case 'setName':
                names[connectionId] = body.name;
                await sendToAll(Object.keys(names), { members: Object.values(names) });
                await sendToAll(Object.keys(names), { systemMessage: `${names[connectionId]} has joined the chat` });
                break
            case 'sendPublic':
                await sendToAll(Object.keys(names), { publicMessage: `${names[connectionId]}: ${body.message}` })
                break
            case 'sendPrivate':
                const to = Object.keys(names).find(key => names[key] === body.to)
                await sendToOne(to, { privateMessage: `${names[connectionId]}: ${body.message}` })
                break
            default:
                console.log('Received unknown route:', route)
        }
    } else {
        const connId = event.connId;
        await postMessage({ message: event.message }, connId);
    }
    return {
        statusCode: 200,
    }
}

