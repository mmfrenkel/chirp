
document.addEventListener('DOMContentLoaded', () => {

    debugger;

    // Connect to websocket
    var socket = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    document.querySelectorAll('.channelTab').forEach(button => {
        button.onclick = openChannel;
    })

    document.querySelectorAll('.submitNewMessage').forEach(form => {
        form.onsubmit = emitMessage;
    })

    document.querySelector('#newChannelForm').onsubmit = () => {

        debugger;
        // create new channel elements
        const channelName = document.querySelector('#newChannelName').value;
        createNewChannel(channelName);
        createNewChannelTab(channelName);

        // reset the form, don't reload
        document.querySelector('#newChannelForm').reset();

        // now tell the server a new channel is available
        socket.emit(
            'added channel',
            {
                'channelName': channelName,
                'cleanedChannelName': channelName.replace(/\W/g, '')
            }
        );

        // save it as that user's channel
        storeUserChannel(channelName);
        return false;
    }

    document.querySelector('#existingChannelForm').onsubmit = () => {

        // create channel elements
        const existingChannel = document.querySelector('#existingChannels').value;
        createChannel(existingChannel);
        createChannelTab(existingChannel);
        loadChannel(existingChannel);

        // reset the form, don't reload
        document.querySelector('#existingChannels').reset();

        // now tell the server a new channel is available
        //socket.emit('user requested channel', {'channel': existingChannel, 'user': userName});
        // return false;
    }

    document.querySelector('#newUserForm').onsubmit = () => {
        debugger;
        const newUser = document.querySelector('#usernameField').value;
        launchNewUser(newUser);
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
        const messageContent = JSON.parse(data);
        loadMessageToChannel(messageContent);
    });

    debugger;
    if (!localStorage.getItem('userIdentity')) {
        console.log(localStorage.getItem('userIdentity'))
        document.getElementById('popup').style.display='block';
    } else {
        launchExistingUser()
    }
});

// HELPER FUNCTIONS

function launchExistingUser() {

    debugger;
    // get the list of channels associated with the user...
    loadAvailableChannels();
    const listChannels = getListUserChannels();

    // ... then load in each channel
    for (let i in listChannels) {

        var channelName = listChannels[i];
        if (channelName != "Welcome") {  // the Welcome channel is the default on the page, so already exists
            createNewChannel(channelName);
            createNewChannelTab(channelName);
        }
        loadChannel(channelName);
    }
    document.getElementById("defaultOpen").click();
}

function launchNewUser(prospectiveUserName) {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/create_user', false);

    // Callback function for when request completes
   request.onload = () => {

       const data = JSON.parse(request.responseText);

       if (data.available) {
           // setup for new user
           window.localStorage.setItem('userIdentity', prospectiveUserName);
           document.getElementById('popup').style.display='none';
           storeUserChannel('Welcome');
           loadChannel('Welcome');
           loadAvailableChannels();
           document.getElementById('defaultOpen').style.display = "block";

       } else {
           document.querySelector('#status').innerHTML = 'Username Already Taken.';
        }
    }
   const data = new FormData();
   data.append('username', prospectiveUserName);
   request.send(data);
}

function loadChannel(channelName) {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/messages', false);

    // Callback function for when request completes
   request.onload = () => {

       debugger;
       const data = JSON.parse(request.responseText);

       if (data.success) {
           if (data.messages != null) {
               const messageInfo = JSON.parse(data.messages);
               for (let message in messageInfo['messages']) {
                   loadMessageToChannel(messageInfo['messages'][message]);
               }
           }
       } else {
           alert(`Warning! Something bad happened when attempting to load ${channelName}`);
       }
    }

   const data = new FormData();
   data.append('channelName', channelName);
   request.send(data);
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

    debugger;
    const cleanedChannelName = channelName.replace(/\W/g, '');

    const newChannel = elementFactory (
        'div',
        {
            'class': 'channel',
            'id': cleanedChannelName
        },
        elementFactory (
            'div',
            {'class': 'channelHeader'},
            elementFactory (
                'h3',
                {},
                `${channelName}`
            )
        ),
        elementFactory (
            'div',
            {
                'class': 'container chat',
                'id': `${cleanedChannelName}Chat`
            },
            elementFactory (
                'div',
                {'class': 'row'},
                elementFactory (
                    'p',
                    {'class': 'messageContent'},
                    'Start your conversation...'
                )
            )
        ),
        elementFactory(
            'div',
            {'class': 'channelFooter'},
            elementFactory(
                'form',
                {
                    'class': 'submitNewMessage',
                    'id': `${cleanedChannelName}Form`,
                    'data-channelname': channelName
                },
                elementFactory(
                    'input',
                    {
                        'class': 'form-control newMessage',
                        'type': 'text',
                        'placeholder': 'Write a message',
                        'name': 'message',
                        'id': `${cleanedChannelName}FormValue`
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

    debugger;
    newChannel.style.display = "none";
    document.getElementById("channelContainer").appendChild(newChannel);

    // now add the button's 'send' action
    document.querySelector(`#${cleanedChannelName}Form`).onsubmit = emitMessage;
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
    document.getElementById(channelName.replace(/\W/g, '')).style.display = "block";

    // change all buttons to inactive, except "this" button
    const channelTabs = document.getElementsByClassName("channelTab");
    for (let tab of channelTabs) {
        // first, by default, switch to inactive
        tab.className = tab.className.replace(" active", "");
    }
    this.className += " active";
}

function loadMessageToChannel(data) {

    var alignment, type;

    if (data.user === window.localStorage.getItem('userIdentity')) {
        alignment = "right";
        type = "self";
    } else {
        alignment = "left";
        type = "other";
    }

    const messageHeader = elementFactory (
        'div',
        {},
        elementFactory(
            'p',
            {
                'class': `messageHeader ${type}`,
                'style': `text-align: ${alignment}`
            },
            data.message_header
        )
    );

    const messageContent = elementFactory (
        'div',
        {},
        elementFactory(
            'p',
            {
                'class': 'messageContent',
                'style': `text-align: ${alignment}`
            },
            data.message
        )
    );
    document.getElementById(`${data.cleanedChannelName}Chat`).appendChild(messageHeader);
    document.getElementById(`${data.cleanedChannelName}Chat`).appendChild(messageContent);
}

function addNewChannelOption(channelName) {
    const option = document.createElement('option');
    option.setAttribute('value', channelName);
    option.innerHTML = channelName;
    document.querySelector('#existingChannels').append(option);
}

function storeUserChannel(channelName) {

    // get the existing list of user channels and push new name onto it
    var channelArray = getListUserChannels();
    if (!channelArray.includes(channelName)) channelArray.push(channelName)

    localStorage.setItem('userChannels', JSON.stringify(channelArray))
}

function getListUserChannels() {

    if (localStorage.getItem('userChannels') != null) {
        var channels = JSON.parse(localStorage.getItem('userChannels'));
    } else {
        var channels = ['Welcome']; // startApplication() case
    }
    return channels;
}

function emitMessage(e) {

    // Connect to websocket
    var socketMessage = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    debugger;
    socketMessage.emit(
        'handle message',
        {
            'channelName': e.target.dataset.channelname,
            'cleanedChannelName': e.target.id.split("Form")[0],
            'user': window.localStorage.getItem('userIdentity'),
            'time': (new Date).toISOString(),
            'message': document.getElementById(e.target.id + "Value").value
        }
    );
    document.getElementById(e.target.id + "Value").value = "";
    return false;
}

function loadAvailableChannels() {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/available_channels', false);

    // Callback function for when request completes
   request.onload = () => {
       debugger;
       const data = JSON.parse(request.responseText);
       for (let channelName in data.availableChannels) {
           addNewChannelOption(data.availableChannels[channelName])
       }
    }
   request.send();
}
