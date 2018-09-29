'use strict';

import {LOG} from './utils/log.js';

export class PeerConnection {
    constructor() {
        this.callbacks = {};
    }

    sendMessage(msg, content) {
        LOG.ERROR("Not implemented: PeerConnection.sendMessage");
    }

    setMessageCallback(msg, cb) {
        this.callbacks[msg] = cb;
    }
}
