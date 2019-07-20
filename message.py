"""
Defines Message() helper class.
"""


class Message:

    def __init__(self, time_created, user, content, message_type):
        self.time_created = time_created
        self.user = user
        self.content = content
        self.message_type = message_type   # options are "message" OR "announcement"
