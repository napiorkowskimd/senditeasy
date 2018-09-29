import {PeerConnection} from './peer_connection.js';

var Messages = Object.freeze({
    'CREATE_CONNECTION': "create connection",
    'PEER_CONNECTION': "peer connection",
    'PEER_MSG': "peer msg"
});

export class ServerPeerConnection extends PeerConnection {
    constructor(server, other_id) {
        super();
        this.server = server;
        this.other_id = other_id;
    }

    sendMessage(msg, content) {
        this.server.sendMessage(this.other_id, msg, content);
    }

    getMessage(type, content) {
        if(this.callbacks[type]) {
            this.callbacks[type](content)
        }else {
            LOG.WARNING("Message " + type + " ignored");
        }
    }
}

export class ServerClient {
    constructor() {
        this.socket = io();
        this.socket.on(Messages.PEER_CONNECTION, this.onPeerConnection.bind(this));
        this.socket.on(Messages.PEER_MSG, this.onPeerMsg.bind(this));
        this.resolves = {};
        this.connections = {};
    }

    createPeerConnection(other_id) {
        return new Promise((res, _) => {
            this.socket.emit(Messages.CREATE_CONNECTION, {
                other_id: other_id
            });
            this.resolves[other_id] = res;
        })
    }

    onPeerConnection(info) {
        var other_id = info['connection_id'];
        var pc = new ServerPeerConnection(this, other_id);
        this.connections[other_id] = pc;
        this.resolves[other_id](pc);
    }

    onPeerMsg(info) {
        var other_id = info['connection_id'];
        var msg = info['msg'];
        var content = info['content'];
        this.connections[other_id].getMessage(msg, content);
    }

    sendMessage(other_id, msg, content) {
        this.socket.emit(Messages.PEER_MSG, {
            'other_id': other_id,
            'msg': msg,
            'content': content
        });
    }

}
