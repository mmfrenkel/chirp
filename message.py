
class Message:

    def __init__(self, time_created, user, content, type):
        self.time_created = time_created
        self.user = user
        self.content = content
        self.type = type   # options are "message" OR "announcement"
