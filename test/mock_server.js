import {PeerConnection} from '../resources/js/peer_connection.js';
import {LOG} from '../resources/js/utils/log.js';

export class MockServerPeerConnection extends PeerConnection {
    constructor(server, other) {
        super();
        this.server = server;
        this.other = other;
    }

    sendMessage(type, content) {
        this.server.sendMessage(this.other, type, content);
    }

    getMessage(type, content) {
        if(this.callbacks[type]) {
            this.callbacks[type](content)
        }else {
            LOG.WARNING("Message " + type + " ignored");
        }
    }
}

export class MockServer {
    constructor() {
        this.connections = [];
    }

    createTwoConnectionEnds() {
        var i = this.connections.length;
        var first = new MockServerPeerConnection(this, i+1);
        var second = new MockServerPeerConnection(this, i);
        this.connections[i] = first;
        this.connections[i+1] = second;
        return [first, second];
    }

    sendMessage(rec, type, content) {
        if(!this.connections[rec]){
            LOG.ERROR("Connection end doesn't exist");
            return;
        }
        LOG.INFO("Sending message: " + type)
        this.connections[rec].getMessage(type, content);
    }
}
