from flask import Flask, render_template, session, request, send_from_directory, redirect, url_for
import pyqrcode
import random
import string
import os


class WebServer:
    app = Flask(__name__)
    app.secret_key = os.urandom(24)
    qr_code_length = 20

    def __init__(self, app, port):
        app.run(debug=True, port=port)

    @staticmethod
    @app.route("/generated_qr", methods=['GET'])
    def starting_page(debug=True):
        if 'sess_id' not in session:
            WebServer.create_new_sess()
            if 'qr_code' not in session:
                WebServer.add_qr_to_sess()
        return render_template('starting_page.html', filename='{}_qr.png'.format(session['qr_code']))

    @staticmethod
    @app.route("/generate_new_qr", methods=['GET'])
    def generate_new_qr():
        if request.method == 'GET':
            if 'sess_id' not in session:
                WebServer.create_new_sess()
                WebServer.add_qr_to_sess()
            else:
                WebServer.add_qr_to_sess()
        return redirect(url_for('starting_page'))

    @staticmethod
    def create_new_sess(debug=True):
        session['sess_id'] = WebServer.random_string_gen(15)
        if debug is True:
            print 'new session ID: {}'.format(session['sess_id'])

            try:
                WebServer.create_work_dir_sess()
            except OSError:
                print 'Could not create a folder for session: {}'.format(session['sess_id'])
                return

    @staticmethod
    def add_qr_to_sess(debug=True):
        session['qr_code'] = WebServer.random_string_gen(20)
        if debug is True:
            print 'session ID: {}\nnew QR code: {}'.format(session['sess_id'], session['qr_code'])

        try:
            WebServer.qr_code_to_image()
        except OSError:
            print 'Could not save QR - image:{}'.format(session['qr_code'])
            return

    @staticmethod
    @app.route('/image/<filename>')
    def send_qr_image(filename):
        return send_from_directory('workdir/{}/'.format(session['sess_id']), filename)

    @staticmethod
    def random_string_gen(length_of_string=20):
        chars = string.ascii_uppercase + string.digits
        rand_string = ''.join(random.choice(chars) for _ in range(length_of_string))
        return rand_string

    @staticmethod
    def create_work_dir_sess():
        os.mkdir('workdir/{}'.format(session['sess_id']))

    @staticmethod
    def qr_code_to_image():
        image_path = 'workdir/{}/{}_qr.png'.format(session['sess_id'], session['qr_code'])
        qr = pyqrcode.create(session['qr_code'])
        qr.png(image_path, scale=10)


if __name__ == "__main__":
    app = WebServer(WebServer.app, 5001)
