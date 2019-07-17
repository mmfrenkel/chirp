from message import Message
from datetime import datetime


class Channel:

    def __init__(self, name):
        self.name = name
        self.messages = list()
        self.users = list()
        self.date_created = datetime.now()

    def add_message(self, user, time, content):
        """
        Adds a new message object to the list of Messages in this channel. Channel can only hold
        100 messages at a time; older messages will be removed.

        :param user: username of person who submitted the message
        :param time: time that the message was submitted by user
        :param content: text of the message
        """
        self.messages.append(Message(user=user, time_created=time, content=content))

        # once 100 messages is met, pop the oldest message off
        if len(self.messages) > 100:
            self.messages.pop(0)

    def add_user(self, user):
        """
        Add a new user to the channel
        :param user: username of new user
        """
        self.users.append(user)
