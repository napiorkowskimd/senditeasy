from flask import Flask, render_template, session, request, abort, redirect, send_from_directory
from flask_socketio import SocketIO, send, emit
import pyqrcode
from uuid import uuid4
import os


class Client(object):
    """docstring for Client."""
    def __init__(self, qr_id, session_id):
        super(Client, self).__init__()
        self.qr_id = qr_id
        self.session_id = session_id
        self.other = None

    def __str__(self):
        return "Client({}, {}, {})".format(self.qr_id, self.session_id, self.other)

class ClientFactory(object):
    def __init__(self):
        self.clients = dict()
        self.pairs = dict()

    def create(self):
        print("creating new client")
        id = uuid4().hex
        client = Client(id, None)
        self.clients[id] = client;
        return client

    def get(self, client_id=None):
        if client_id == None:
            if 'id' not in session:
                client = self.create()
                session['id'] = client.qr_id
                return client
            client_id = session['id']
        return self.clients.get(client_id, None)


def main(port):
    app = Flask(__name__)
    app.secret_key = os.urandom(24)
    clients = ClientFactory()
    socketio = SocketIO(app)
    socketio.init_app(app)

    hostname = "192.168.0.104"

    @app.route("/", methods=['GET'])
    def receiver():
        client = clients.get()
        return render_template('receiver.html', qr_id=client.qr_id)

    @app.route("/images/qr_code.png")
    def qr_image():
        client = clients.get()
        workdir = './workdir/{}'.format(client.qr_id)
        if os.path.exists(workdir):
            return send_from_directory(workdir, 'qr.png')
        os.mkdir(workdir)
        qr = pyqrcode.create('{}:{}/client/{}'.format(hostname, str(port), client.qr_id))
        qr.png(workdir + '/qr.png', scale=10)
        return send_from_directory(workdir, 'qr.png')

    @app.route("/client/<id>", methods=['GET'])
    def sender(id):
        rec_client = clients.get(id)
        if rec_client == None:
            abort(404)
        this = clients.get()
        if this == rec_client:
            return redirect('/')
        this.other = rec_client.qr_id
        rec_client.other = this.qr_id
        print("this:", this)
        print("receiver:", rec_client)
        return render_template('sender.html', other=id)

    @socketio.on('connect')
    def handleConnected():
        client = clients.get()
        client.session_id = request.sid
        print("socket connected:", client)

    @socketio.on('create connection')
    def handleCreateConnection(data):
        print("create connection:", data)
        other_id = data['other_id']
        other = clients.get(other_id)
        if other == None:
            print("No such client:", other_id)
            return
        this = clients.get()
        this.other = other;
        other.other = this;
        emit('peer connection', {'other_id': this.qr_id}, room=other.session_id)
        emit('peer connection', {'other_id': other.qr_id}, room=this.session_id)

    @socketio.on('peer msg')
    def handlePeerMsg(data):
        sender = clients.get()
        receiver = sender.other
        if receiver == None:
            print("message to non-existing client")
            return
        emit('peer msg',
            {'msg': data['msg'],
             'other_id': sender.qr_id,
             'content': data['content']}, room=receiver.session_id)

    return app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == "__main__":
    main(5001)
