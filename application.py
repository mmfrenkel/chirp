import os
import json
from channel import Channel
from helpers import format_date_string
from datetime import datetime

from flask import Flask, request, render_template, jsonify
from flask_socketio import SocketIO, emit
from flask_session import Session

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["SESSION_TYPE"] = "filesystem"

socketio = SocketIO(app)
Session(app)

# store the users and channels from each session, starting with default "welcome"
channels = [Channel(visible_name="Welcome", cleaned_name="Welcome")]
users = []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/create_user", methods=["POST"])
def check_username_available():
    """
    Handles request from client asking for a new user to be created. If the username
    is not already taken, will respond that the name is 'available.'
    """

    prospective_username = request.form.get('username')

    if prospective_username not in users:
        users.append(prospective_username)
        return jsonify(available=True)
    else:
        return jsonify(available=False)


@app.route("/api/available_channels", methods=["POST"])
def available_channels():
    """
    Handles request from client asking for all channels that have been created
    by application users  (i.e., a list of all channel names in channels list
    in memory), and returns list of 'uncleaned' channel names.
    """

    channel_names = [channel.name for channel in channels]

    print(f"Here is the list of available channels: {channel_names}")
    return jsonify(availableChannels=channel_names)
    

@app.route("/api/messages", methods=["POST"])
def get_messages():
    """
    Handles request from client asking for all messages/announcements associated with
    a specific channel in memory (i.e., channels list). Returns json containing message
    about if the request is successful, and if successful, which messages are available.
    """

    try:
        # get the Channel() object
        channel_name = request.values.get('channelName')
        channel_index = get_index_of_channel_stored(channel_name)

        if channel_index is not None:
            channel_object = channels[channel_index]
            list_messages = channel_object.get_messages()
            print(f"Got messages for {channel_object.name}: {list_messages}")
        else:
            # handle case where local storage may still hold channel, but it's not in restarted server
            list_messages = None

        result = {
            "success": True,
            "messages": list_messages if list_messages else None
        }
        return jsonify(result)

    except Exception:
        result = {
            "success": False
        }
        return jsonify(result)


@socketio.on("new channel")
def add_channel(data):
    """
    Listens for when a 'new channel' announcement is emitted in order to
    add a new Channel() object to the list of available channels and
    broadcast new channel to all users.
    """

    channels.append(
        Channel(
            visible_name=data['channelName'],
            cleaned_name=data['cleanedChannelName']
        )
    )
    print(f"Added a new channel: {data['channelName']}")

    # tell the world about it
    content = {
        "new_channel": data['channelName']
    }
    emit("announce channel", json.dumps(content), broadcast=True)


@socketio.on("add channel user")
def new_channel_user(data):
    """
    Listens for when a 'new channel user' announcement (with data) is emitted in order to
    add a new user to an Channel() object's list of users and broadcast that a new user
    has joined the channel to all users.
    """

    add_user_to_channel(data['username'], data['channelName'])
    print(f"Added new user ({data['username']}) to channel ({data['channelName']})")

    # tell the world about it
    content = {
        "channelName": data['channelName'],
        "cleanedChannelName": data['cleanedChannelName'],
        "username": data['username']
    }
    emit("new channel user", json.dumps(content), broadcast=True)


@socketio.on("handle message")
def handle_message(data):
    """
    Listens for when a new message announcement (with data) is emitted in order to
    add a new Message() object to the appropriate Channel() object and then broadcast
    the new message to all users.
    """

    # get the channel object from the list of channels
    channel_name = data['channelName']
    cleaned_channel_name = data['cleanedChannelName']
    channel_index = get_index_of_channel_stored(channel_name)

    # if channel index doesn't yet exist, make sure to create the object in order to get index
    if channel_index is None:
        channels.append(
            Channel(
                visible_name=channel_name,
                cleaned_name=cleaned_channel_name
            )
        )
        print(f"While handling message, added this channel: {channel_name}")
        channel_index = len(channels) - 1  # this must be index, order of elements in lists persists

    channel_object = channels[channel_index]

    # add the message to the channel_object
    channel_object.add_message(
        user=data['user'],
        time=format_date_string(data['time']),
        content=data['message'],
        message_type="message"
    )
    channels[channel_index] = channel_object

    # tell the world about it
    message_content = {
        "channelName": channel_name,
        "cleanedChannelName": cleaned_channel_name,
        "user": data['user'],
        "message_header":  data['user'] + " (" + format_date_string(data['time']) + "):",
        "message": data['message']
    }
    print(f"Added this message to {channel_object.name}: {message_content}")
    emit("new message", json.dumps(message_content), broadcast=True)


def add_user_to_channel(username, channel_name):
    """
    Adds a new user to a channel, first by finding the channel, then
    adding a user and logging a "new user" announcement.

    :param username:       username of user added
    :param channel_name:   channel user added themselves to
    """

    channel_index = get_index_of_channel_stored(channel_name)
    channel_object = channels[channel_index]

    channel_object.add_user(username)
    channel_object.add_message(
        user=username,
        time=datetime.now().strftime("%m/%d/%Y, %H:%M:%S"),
        content=f'{username} was added to channel.',
        message_type="announcement"
    )
    channels[channel_index] = channel_object


def get_index_of_channel_stored(channel_name):
    """
    Helper function for finding the index of a channel, specified by its
    name, in the list of available channels.

    :param channel_name:   'uncleaned' channel name
    :return:               integer representing index in list
    """

    index_channel = 0
    for channel in channels:
        if channel.name == channel_name:
            return index_channel
        else:
            index_channel += 1
    return None
