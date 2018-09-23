'use strict';

import {LOG} from './log.js';

var WebRTCConnectionState = Object.freeze({
    "NOT_INITIALIZED": 0,
    "WAITING_FOR_SDP_ANSWER": 1,
    "IDLE": 2,
    "TRANSMITING_DATA": 3
})

export class WebRTCConnectionClient {
    constructor (init_peer_connection) {
        this.init_peer_connection = init_peer_connection;
        this.peer_connection = new RTCPeerConnection();
        this.peer_connection.addEventListener('icecandidate', (candidate) => {
            this.init_peer_connection.sendMessage('ice_candidate', candidate);
        });
        this.data_channel = undefined;
        this.state = WebRTCConnectionState.NOT_INITIALIZED;
        this.local_sdp = undefined;
        this.remote_sdp = undefined;
        this.setIceCandidateCallback();
        this.setSdpOfferCallback();
        this.setSdpAcceptCallback();
    }

    initializeWebRTCConnection() {
        LOG.INFO("Initializing webrct connection");
        this.data_channel = this.peer_connection.createDataChannel("ch1");
        var self = this;
        this.peer_connection.addEventListener('negotiationneeded',
            function __negotiation_after_data_channel() {
                LOG.INFO("Negotiating connection");
                self.peer_connection.removeEventListener('negotiationneeded',
                        __negotiation_after_data_channel);
                self.peer_connection.createOffer()
                    .then((offer) => {
                        LOG.INFO("Created sdp offer");
                        LOG.DEBUG("Local sdp: " + offer.sdp);
                        self.state = WebRTCConnectionState.WAITING_FOR_SDP_ANSWER;
                        self.local_sdp = offer;
                        return self.peer_connection.setLocalDescription(offer);
                    })
                    .then(() => {
                        LOG.INFO("Sending sdp...");
                        self.sendSdpOffer(self.local_sdp);
                    })
                    .catch((err) => {
                        LOG.ERROR(err);
                    })

        });
    }

    setIceCandidateCallback() {
        this.init_peer_connection.setMessageCallback('ice_candidate',
           this.onIceCandidate.bind(this));
    }

    onIceCandidate(candidate) {
        LOG.INFO("New ice candidate from: " + this.init_peer_connection.other);
        this.peer_connection.addIceCandidate(candidate);
    }

    setSdpOfferCallback() {
        this.init_peer_connection.setMessageCallback('sdp_offer',
            this.onSdpOffer.bind(this));
    }

    onSdpOffer(offer) {
        LOG.INFO("New sdp offer from: " + this.init_peer_connection.other);
        LOG.DEBUG("sdp: " + offer.sdp);
        this.peer_connection.setRemoteDescription(offer)
            .then(() => {
                LOG.INFO("Remote sdp offer set successfully");
                this.remote_sdp = offer;
                if(this.state === WebRTCConnectionState.WAITING_FOR_SDP_ANSWER) {
                    this.state = WebRTCConnectionState.IDLE;
                    LOG.INFO("Sending sdp_accept....");
                    this.sendSdpAccept();
                    return;
                }
                if(this.state === WebRTCConnectionState.NOT_INITIALIZED) {
                    this.peer_connection.createAnswer()
                        .then((offer) => {
                            LOG.INFO("Sending answer sdp....");
                            this.state = WebRTCConnectionState.WAITING_FOR_SDP_ANSWER;
                            this.sendSdpOffer(offer);
                        });
                    return;
                }
                LOG.ERROR("Wrong state when receiveing offer");
            })
            .catch((err) => {
                LOG.ERROR(err);
            })
    }

    setSdpAcceptCallback() {
        this.init_peer_connection.setMessageCallback('sdp_accept',
            this.onSdpAccept.bind(this));
    }

    onSdpAccept() {
        LOG.INFO("Connection established");
        this.state = WebRTCConnectionState.IDLE;
    }

    sendSdpOffer(offer) {
        this.init_peer_connection.sendMessage('sdp_offer', offer);
    }

    sendSdpAccept() {
        this.init_peer_connection.sendMessage('sdp_accept');
    }

    sendIceCandidate(candidate) {
        this.init_peer_connection.sendMessage('ice_candidate', candidate);
    }
}
