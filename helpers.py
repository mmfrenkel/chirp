
def create_message_header(username, time):
    return username + " (" + format_date_string(time) + "):"


def format_date_string(date_string):
    return date_string.split('T')[0] + " " + date_string.split('T')[1][:8]