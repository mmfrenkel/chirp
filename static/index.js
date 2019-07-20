
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

        const channelName = document.querySelector('#newChannelName').value;

        addNewChannel(channelName);               // create the channel in UI
        addNewChannelTab(channelName);            // create the tab in UI
        emitNewAvailableChannel(channelName);     // tell the server a new channel is available
        addUserChannel(channelName);              // keep track of channels belonging to user
        reportNewChannelUser(channelName);        // tell the server about the new user

        // reset the form
        document.querySelector('#newChannelForm').reset();
        return false;
    }

    document.querySelector('#existingChannelForm').onsubmit = () => {

        const existingChannel = document.querySelector('#existingChannels').value;

        addNewChannel(existingChannel);          // create the channel in UI
        addNewChannelTab(existingChannel);       // create the tab in UI
        loadChannel(existingChannel);            // load any existing channels from server
        addUserChannel(existingChannel);         // keep track of channels belonging to user
        reportNewChannelUser(existingChannel);   // tells server that new user exists + broadcasts

        debugger;
        return false;
    }

    document.querySelector('#newUserForm').onsubmit = () => {
        const newUser = document.querySelector('#usernameField').value;
        launchNewUser(newUser);
    }

    socket.on('announce channel', data => {
        debugger;
        const parsedData = JSON.parse(data);
        addNewChannelOption(parsedData['new_channel']);
    });

    // When a new user is added to a channel....
    socket.on('new channel user', data => {
        const parsedData = JSON.parse(data);
        addAnnouncement(parsedData['username'], parsedData['cleanedChannelName']);
    });

    // When a new user is added to a channel....
    socket.on('new message', data => {
        addMessageToChannel(JSON.parse(data));
    });

    if (!localStorage.getItem('userIdentity')) {
        console.log(localStorage.getItem('userIdentity'))
        document.getElementById('popup').style.display='block';
    } else {
        launchExistingUser()
    }
});

// HELPER FUNCTIONS

function launchNewUser(username) {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/create_user', false);

    // Callback function for when request completes
   request.onload = () => {

       const data = JSON.parse(request.responseText);

       if (data.available) {

           window.localStorage.setItem('userIdentity', username);
           document.getElementById('popup').style.display='none';

           addUserChannel('Welcome');         // adds 'Welcome' channel to local storage list of channels
           loadChannel('Welcome');            // loads any existing 'Welcome' messages on server
           loadAvailableChannels();           // gets all channels in use from user to add to options list
           reportNewChannelUser('Welcome')    // tells server that new user exists + broadcasts

           // display 'Welcome' channel
           document.getElementById('defaultOpen').style.display = "block";

       } else {
           document.querySelector('#status').innerHTML = 'Username Already Taken.';
        }
    }
   const data = new FormData();
   data.append('username', username);
   request.send(data);
   return false;
}

function launchExistingUser() {

    debugger;
    // get the list of channels associated with the user...
    loadAvailableChannels();
    const listChannels = getListUserChannels();

    // ... then load in each channel
    for (let i in listChannels) {

        var channelName = listChannels[i];
        if (channelName != "Welcome") {  // the Welcome channel is the default on the page, so already exists
            addNewChannel(channelName);
            addNewChannelTab(channelName);
        }
        loadChannel(channelName);
    }
    document.getElementById("defaultOpen").click();
    return false;
}

function loadChannel(channelName) {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/messages', false);

    // Callback function for when request completes
   request.onload = () => {

       debugger;
       const data = JSON.parse(request.responseText);

       if (data.success && data.messages != null) {
           const messageInfo = JSON.parse(data.messages);
           for (let message in messageInfo['messages']) {

               var messageContent = messageInfo['messages'][message];
               if (messageContent['type'] === 'message') {
                   addMessageToChannel(messageContent);
               } else if (messageContent['type'] === 'announcement') {
                   addAnnouncement(messageContent.user, messageContent.cleanedChannelName);
               }
           }
       } else if (!data.success) {
           alert(`Warning! Something bad happened when attempting to load ${channelName}`);
       }
    }

   const data = new FormData();
   data.append('channelName', channelName);
   request.send(data);
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
   return false;
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

function emitMessage(e) {

    var socketMessage = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

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

function emitNewAvailableChannel(channelName) {

    var newChannelSocket = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    // now tell the server a new channel is available
    newChannelSocket.emit(
        "new channel",
        {
            'channelName': channelName,
            'cleanedChannelName': channelName.replace(/\W/g, ''),
            'userName': window.localStorage.getItem('userIdentity')
        }
    );
    return false;
}

function reportNewChannelUser(channelName) {

    var socketChannel = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    socketChannel.emit(
        'add channel user',
        {
            'channelName': channelName,
            'cleanedChannelName': channelName.replace(/\W/g, ''),
            'username': window.localStorage.getItem('userIdentity')
        }
    );
    return false;
}

function addUserChannel(channelName) {

    // get the existing list of user channels and push new name onto it
    var channelArray = getListUserChannels();
    if (!channelArray.includes(channelName)) channelArray.push(channelName)
    localStorage.setItem('userChannels', JSON.stringify(channelArray))
}

function addNewChannel(channelName) {

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
    newChannel.style.display = "none";
    document.getElementById("channelContainer").appendChild(newChannel);

    // add the button's 'send' action
    document.querySelector(`#${cleanedChannelName}Form`).onsubmit = emitMessage;
}

function addNewChannelTab(channelName) {

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

function addNewChannelOption(channelName) {
    const option = document.createElement('option');
    option.setAttribute('value', channelName);
    option.innerHTML = channelName;
    document.querySelector('#existingChannels').append(option);
}

function addMessageToChannel(data) {

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

function addAnnouncement(username, cleanedChannelName) {

    var message;
    if (username === window.localStorage.getItem('userIdentity')) {
        message = 'You joined this channel.'
    } else {
        message = `${username} joined this channel.`
    }

    const userAnnoucement = elementFactory (
        'div',
        {},
        elementFactory(
            'p',
            { 'class': 'userAnnoucement'},
            message
        )
    );
    document.getElementById(`${cleanedChannelName}Chat`).appendChild(userAnnoucement);
}

function getListUserChannels() {

    if (localStorage.getItem('userChannels') != null) {
        var channels = JSON.parse(localStorage.getItem('userChannels'));
    } else {
        var channels = ['Welcome'];  // launchNewUser(), setup case
    }
    return channels;
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
