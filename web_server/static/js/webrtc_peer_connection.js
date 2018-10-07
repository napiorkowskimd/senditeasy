'use strict';

import {LOG} from './utils/log.js';
import {PeerConnection} from './peer_connection.js';

var Status = Object.freeze({
    "NONE": 0,
    "WAITING_FOR_SDP": 1,
    "WAITING_FOR_DATA_CHANNEL": 2,
    "READY": 3
});

var Role = Object.freeze({
    "NONE": 0,
    "SLAVE": 1,
    "MASTER": 2
});

export class WebRTCPeerConnection extends PeerConnection {
    constructor (init_peer_connection) {
        super();
        this.init_peer_connection = init_peer_connection;
        this.pc = new RTCPeerConnection({
            iceServers: [
                {urls:'stun:stun01.sipphone.com'},
                {urls:'stun:stun.ekiga.net'},
                {urls:'stun:stun.fwdnet.net'},
                {urls:'stun:stun.ideasip.com'},
                {urls:'stun:stun.iptel.org'},
                {urls:'stun:stun.rixtelecom.se'},
                {urls:'stun:stun.schlund.de'},
                {urls:'stun:stun.l.google.com:19302'},
                {urls:'stun:stun1.l.google.com:19302'},
                {urls:'stun:stun2.l.google.com:19302'},
                {urls:'stun:stun3.l.google.com:19302'},
                {urls:'stun:stun4.l.google.com:19302'},
                {urls:'stun:stunserver.org'},
                {urls:'stun:stun.softjoys.com'},
                {urls:'stun:stun.voiparound.com'},
                {urls:'stun:stun.voipbuster.com'},
                {urls:'stun:stun.voipstunt.com'},
                {urls:'stun:stun.voxgratia.org'},
                {urls:'stun:stun.xten.com'}
            ]
        });
        this.pc.addEventListener('icecandidate', (ev) => {
            this.sendMessage('ice_candidate', ev.candidate);
        });

        this.role = Role.NONE;
        this.message_channel = undefined;
        this.data_channel = undefined;
        this.local_sdp = undefined;
        this.remote_sdp = undefined;

        this.onConnected = () => {};
        this.should_call_cb_ = true;
        this.setMessageCallback('ice_candidate', this.onIceCandidate.bind(this));
        this.setMessageCallback('sdp_offer', this.onSdpOffer.bind(this));
        this.setMessageCallback('sdp_answer', this.onSdpAnswer.bind(this));
    }

    getStatus() {
        switch (this.pc.signalingState) {
            case "have-local-offer":
            case "have-remote-offer":
            case "have-local-pranswer":
            case "have-remote-pranswer":
                return Status.WAITING_FOR_SDP;
                break;
            case "stable":
                if (this.data_channel && this.data_channel.readyState === "open"
                    && this.message_channel && this.message_channel.readyState === "open")
                    return Status.READY;
                switch (this.pc.connectionState) {
                    case "new":
                    case "failed":
                    case "closed":
                        return Status.NONE;
                        break;
                    case "connecting":
                    case "connected":
                        return Status.WAITING_FOR_DATA_CHANNEL;
                        break;
                }
        }
        return Status.NONE;
    }

    async initialize() {
        if(this.role !== Role.NONE) {
            throw new Error("initialize called with wrong state");
        }
        this.role = Role.MASTER;
        this.message_channel = this.pc.createDataChannel("message");
        this.data_channel = this.pc.createDataChannel("data");
        this.prepareMessageChannel();
        this.message_channel.onopen = this.onDatachannelOpen.bind(this);
        this.data_channel.onopen = this.onDatachannelOpen.bind(this);
        this.local_sdp = await this.pc.createOffer({
            offerToReceiveVideo: false,
            offerToReceiveAudio: false
        });
        await this.pc.setLocalDescription(this.local_sdp);
        this.sendMessage("sdp_offer", this.local_sdp);
    }

    async onSdpAnswer(offer) {
        if(this.role !== Role.MASTER) {
            throw new Error("Received answer, but wasn't waiting for one");
        }
        await this.pc.setRemoteDescription(offer);
    }

    async onSdpOffer(offer) {
        if(this.role !== Role.NONE) {
            throw new Error("Received offer, but wasn't waiting for one");
        }
        this.role = Role.SLAVE;
        var onDatachannel = function(event) {
            LOG.INFO("New datachannel: "  + event.channel.label);
            var channel = event.channel;
            channel.onopen = this.onDatachannelOpen.bind(this);
            if(channel.label === "message"){
                this.message_channel = channel;
                this.prepareMessageChannel();
            }
            if(channel.label === "data"){
                this.data_channel = channel;
            }
        }
        this.pc.addEventListener("datachannel", onDatachannel.bind(this));
        await this.pc.setRemoteDescription(offer);
        this.remote_sdp = offer;
        this.local_sdp = await this.pc.createAnswer({
            offerToReceiveVideo: false,
            offerToReceiveAudio: false
        });
        await this.pc.setLocalDescription(this.local_sdp);
        this.sendMessage("sdp_answer", this.local_sdp);
    }

    onIceCandidate(candidate) {
        this.pc.addIceCandidate(candidate);
    }

    onDatachannelOpen() {
        if(this.should_call_cb_ && this.getStatus() == Status.READY){
            this.onConnected();
            this.should_call_cb_ = false;
        }
    }

    sendMessage(msg, content) {
        if(this.getStatus() >= Status.READY) {
            return this._sendMessage(msg, content);
        } else {
            return this.init_peer_connection.sendMessage(msg, content);
        }
    }

    _sendMessage(msg, content) {
        let message = {
            msg: msg,
            content: content
        };
        LOG.INFO("sending message: " + msg);
        this.message_channel.send(JSON.stringify(message))
    }

    onMessage(ev) {
        let data = ev.data
        let message = JSON.parse(data);
        let msg = message['msg'];
        let content = message['content'];
        if(this.callbacks[msg]) {
            this.callbacks[msg](content);
        }
    }

    prepareMessageChannel() {
        this.message_channel.onmessage = this.onMessage.bind(this);
    }

    setMessageCallback(msg, cb) {
        super.setMessageCallback(msg, cb);
        this.init_peer_connection.setMessageCallback(msg, cb);
    }

}
