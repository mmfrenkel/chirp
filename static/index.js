
document.addEventListener('DOMContentLoaded', () => {

    // Connect to websocket
    var socket = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    document.querySelectorAll('.channelTab').forEach(button => {
        button.onclick = openChannel;
    })

    document.querySelectorAll('.submitNewMessage').forEach(form => {
        form.onsubmit = (event) => {
            debugger;
            socket.emit(
                'handle message',
                {
                    'channel': event.target.id.split("Form")[0],
                    'user': window.localStorage.getItem('userIdentity'),
                    'time': (new Date).toISOString(),
                    'message': document.getElementById(event.target.id + "Value").value
                }
            );
            return false;
        }
    })

    document.querySelector('#newChannelForm').onsubmit = () => {

        // create new channel elements
        const newChannelName = document.querySelector('#newChannelName').value;
        createNewChannel(newChannelName);
        createNewChannelTab(newChannelName);

        // reset the form, don't reload
        document.querySelector('#newChannelForm').reset();

        // now tell the server a new channel is available
        socket.emit('added channel', {'channel': newChannelName});

        // save it as that user's channel
        storeChannel(newChannelName);
        return false;
    }

    document.querySelector('#existingChannelForm').onsubmit = () => {

        // create channel elements
        const existingChannel = document.querySelector('#existingChannels').value;
        createChannel(existingChannel);
        createChannelTab(existingChannel);
        // loadExisting(existingChannel)

        // reset the form, don't reload
        document.querySelector('#existingChannels').reset();

        // now tell the server a new channel is available
        socket.emit('user requested channel', {'channel': existingChannel, 'user': userName});
        return false;
    }

    document.querySelector('#newUserForm').onsubmit = () => {
        const newUser = document.querySelector('#usernameField').value;
        createUser(newUser);
    }

    socket.on('announce channel', data => {
        addNewChannelOption(data['new_channel'])
    });

    // When a new user is added to a channel....
    socket.on('new channel user', data => {
        // addNewUser(data['username'])
    });

    // When a new user is added to a channel....
    socket.on('new message', data => {
        debugger;
        addNewMessageToChannel(data);
    });

    if (!localStorage.getItem('userIdentity')) {
        document.getElementById('popup').style.display='block';
    } else {
        // loadUserPage();
    }
});

// HELPER FUNCTIONS

function loadUserPage() {
    document.getElementById("defaultOpen").click();
}

function createUser(prospectiveUserName) {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/create_user', false);

    // Callback function for when request completes
   request.onload = () => {

        debugger;
        const data = JSON.parse(request.responseText);

        console.log(data);

        if (data.available) {
            localStorage.setItem('userIdentity', prospectiveUserName);
            document.getElementById('popup').style.display='none';
            document.getElementById('defaultOpen').style.display = "block";
        } else {
            document.querySelector('#status').innerHTML = 'Username Already Taken.';
        }
    }

   debugger;
   const data = new FormData();
   data.append('username', prospectiveUserName);
   request.send(data);

   return false;
}

// this helper function was inspired by Kyle Shevlin
// (How to Write Your Own JavaScript DOM Element Factory, kyleshelvin.com)
function elementFactory(type, attributes, ...children) {
    const newElement = document.createElement(type);

    for (let attribute in attributes) {
        newElement.setAttribute(attribute, attributes[attribute]);
    }

    if (children[0] !== null) {
        for (let child of children) {
            if (typeof child === 'string') newElement.appendChild(
                document.createTextNode(child)
            );
            else newElement.appendChild(child);
        }
    }
    return newElement;
}

// factory function for generating elements ()
function createNewChannel(channelName) {

    const newChannel = elementFactory (
        'div',
        {
            'class': 'channel',
            'id': channelName
        },
        elementFactory (
            'h3',
            {},
            `Channel: ${channelName}`
        ),
        elementFactory (
            'div',
            {
                'class': 'container chat',
                'id': `${channelName}Chat`
            },
            elementFactory (
                'p',
                {},
                'Start your conversation...'
            )
        ),
        elementFactory(
            'div',
            {'class': 'channelFooter'},
            elementFactory(
                'form',
                {
                    'class': 'submitNewMessage',
                    'id': `${channelName}Form`
                },
                elementFactory(
                    'input',
                    {
                        'class': 'form-control newMessage',
                        'type': 'text',
                        'placeholder': 'Write a message',
                        'name': 'message',
                        'id': `${channelName}FormValue`
                    },
                    null
                ),
                elementFactory(
                    'input',
                    {
                        'class': 'btn',
                        'type': 'submit',
                        'value': 'Enter'
                    },
                    null
                )
            )
        )
    );
    newChannel.style.display = "none";
    document.getElementById("channelContainer").appendChild(newChannel);
}

function createNewChannelTab(channelName) {

    const newTab = elementFactory(
        'button',
        {
            'class': 'channelTab',
            'data-channelname': channelName
        },
        channelName
    )
    newTab.onclick = openChannel;
    document.getElementById("tabList").appendChild(newTab);
}

function openChannel() {

    // Make other panels display as none
    const channels = document.getElementsByClassName("channel");
    for (let channel of channels) {
        channel.style.display = "none";
    }
    // the data-channelName attribute of the button = the id of the content box to display
    const channelName = this.dataset.channelname
    document.getElementById(channelName).style.display = "block";

    // change all buttons to inactive, except "this" button
    const channelTabs = document.getElementsByClassName("channelTab");
    for (let tab of channelTabs) {
        // first, by default, switch to inactive
        tab.className = tab.className.replace(" active", "");
    }
    this.className += " active";
}

function handleNewMessage(e) {

    socket.emit(
        'handle message',
        {
            'channel': e.target.id.split("Form")[0],
            'user': localStorage.get('userIdentity'),
            'time': (new Date).toISOString(),
            'message': document.getElementById(e.target.id + "Value").value
        }
    );
}

function addNewMessageToChannel(response) {

    const data = JSON.parse(response);

    var alignment;
    if (data.user === window.localStorage.getItem('userIdentity')) alignment = "right";
    else alignment = "left";

    const messageHeader = elementFactory (
        'p',
        {
            'class': 'messageHeader',
            'align': alignment
        },
        data.message_header
    );

    const messageContent = elementFactory (
        'p',
        {
            'class': 'messageContent',
            'align': alignment
        },
        data.message
    );
    document.getElementById(`${data.channel}Chat`).appendChild(messageHeader);
    document.getElementById(`${data.channel}Chat`).appendChild(messageContent);
}

function addNewChannelOption(channelName) {
    const option = document.createElement('option');
    option.setAttribute('value', channelName);
    option.innerHTML = channelName;
    document.querySelector('#existingChannels').append(option);
}

function storeChannel(channelName) {

    if (localStorage.getItem('userChannels') === null) {
        let arrayChannel = [channelName];
        localStorage.setItem('userChannel', JSON.stringify(arrayChannel));
    } else {
        let channelArray = getListUserChannels()
        channelArray.push(channelName)
        localStorage.setItem('userChannel', JSON.stringify(channelArray))
    }
}

function getListUserChannels() {
    var channels

    if (localStorage.getItem('userChannels')) {
      channels = JSON.parse(localStorage.getItem('userChannels'));
    } else {
      channels = [];
    }
    return channels
}
