import os
import json
from channel import Channel
from helpers import format_date_string

from flask import Flask, session, request, render_template, jsonify
from flask_socketio import SocketIO, emit
from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["SESSION_TYPE"] = "filesystem"

socketio = SocketIO(app)
Session(app)

# store the users and channels from each session
channels = []
users = []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/messages", methods=["POST"])
def get_messages():

    # testing purposes only
    for channel in channels:
        print(f"Channel: {channel.name}: Messages: {channel.get_messages()}")

    if not channels:
        channels.append(Channel("welcome"))

    try:
        channel_name = request.values.get('channel')
        channel_index = index_of_channel_stored(channel_name)

        # handle weird case where local storage may hold channel not in server
        if channel_index:
            channel_object = channels[channel_index]
            list_messages = channel_object.get_messages()
            print(f"Got messages for {channel_object.name}: {list_messages}")
        else:
            list_messages = None

        result = {
            "success": True,
            "messages": list_messages
        }

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
    if not users or prospective_username not in users:

        users.append(prospective_username)
        return jsonify(available=True)

    else:
        return jsonify(available=False)


@socketio.on("added channel")
def available_channel(data):

    if not channels:
        channels.append(Channel("welcome"))

    channels.append(Channel(data['channel']))
    emit("announce channel", {"new_channel": data['channel']}, broadcast=True)


@socketio.on("handle message")
def handle_message(data):

    # get the channel object from the list of channels
    channel_index = index_of_channel_stored(data['channel'])

    # if channel index doesn't yet exist, create the object to get the index
    if channel_index is None:
        channels.append(Channel(data['channel']))
        channel_index = len(channels) - 1  # order of elements in list persists

    channel_object = channels[channel_index]

    # add the message to the channel_object
    channel_object.add_message(
        user=data['user'],
        time=format_date_string(data['time']),
        content=data['message']
    )

    # reset channel object at location
    channels[channel_index] = channel_object

    message_content = {
        "channel": data['channel'],
        "user": data['user'],
        "message_header":  data['user'] + " (" + format_date_string(data['time']) + "):",
        "message": data['message']
    }

    print(f"Adding this a message to {channel_object.name}: {message_content}")
    emit("new message", json.dumps(message_content), broadcast=True)


def index_of_channel_stored(channel_name):

    index_channel = 0
    for channel in channels:
        if channel.name == channel_name:
            return index_channel
        else:
            index_channel += 1
    return None
