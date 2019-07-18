import os
import json
from channel import Channel
from helpers import format_date_string

from flask import Flask, session, request, render_template, jsonify
from flask_socketio import SocketIO, emit
from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"

socketio = SocketIO(app)
Session(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/messages", methods=["POST"])
def get_messages():

    if session["available_channels"] is None:
        session["available_channels"] = list()
        session["available_channels"].append(Channel("welcome"))

    try:
        channel_name = request.values.get('channel')
        channel_index = index_of_channel_in_session(channel_name)
        channel_object = session["available_channels"][channel_index]
        list_messages = channel_object.get_messages()

        result = {
            "success": True,
            "messages": list_messages
        }

        print(result)
        return jsonify(result)

    except Exception as e:
        print(e)
        result = {
            "success": False,
        }
        return jsonify(result)


@app.route("/api/create_user", methods=["POST"])
def check_username_available():

    prospective_username = request.form.get('username')

    if session.get('app_users') is None or prospective_username not in session.get('app_users'):

        if session.get('app_users') is None:
            session['app_users'] = list()

        session['app_users'].append(prospective_username)
        return jsonify(available=True)

    else:
        return jsonify(available=False)


@socketio.on("added channel")
def available_channel(data):

    if session["available_channels"] is None:
        session["available_channels"] = list()
        session["available_channels"].append(Channel("welcome"))

    session["available_channels"].append(Channel(data['channel']))
    emit("announce channel", {"new_channel": data['channel']}, broadcast=True)


@socketio.on("handle message")
def handle_message(data):

    # get the channel object from the session
    channel_index = index_of_channel_in_session(data['channel'])
    channel_object = session["available_channels"][channel_index]

    # add the message to the channel_object
    channel_object.add_message(
        user=data['user'],
        time=format_date_string(data['time']),
        content=data['message']
    )
    session["available_channels"][channel_index] = channel_object

    message_content = {
        "channel": data['channel'],
        "user": data['user'],
        "message_header":  data['user'] + " (" + format_date_string(data['time']) + "):",
        "message": data['message']
    }

    #  emit("new message", message_content, broadcast=True)
    emit("new message", json.dumps(message_content), broadcast=True)


def index_of_channel_in_session(channel_name):

    index_channel = 0

    for channel in session["available_channels"]:
        if channel.name == channel_name:
            return index_channel
        else:
            index_channel += 1

    return None
