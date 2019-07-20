/**
 * @summary Javascript component of Chirp! Application
 *
 * @file    Provides all features of the Chirp! Application, including message interactions and
 *          communication with the Flask server via XMLHttpRequest and SocketIO.
 *
 * @author mmfrenkel <megan.frenkel@gmail.com>
 */

document.addEventListener('DOMContentLoaded', () => {

    var socket = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    // Defines that channel is opened when user clicks on a tab
    document.querySelectorAll('.channelTab').forEach(button => {
        button.onclick = openChannel;
    })

    // Defines that a message is emitted to the server when a new message is sent
    document.querySelectorAll('.submitNewMessage').forEach(form => {
        form.onsubmit = emitMessage;
    })

    // Defines how a new channel is created when user attempts to create a new one
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

    // Defines addition of a pre-existing channel to user's app channels
    document.querySelector('#existingChannelForm').onsubmit = () => {

        const existingChannel = document.querySelector('#existingChannels').value;

        addNewChannel(existingChannel);          // create the channel in UI
        addNewChannelTab(existingChannel);       // create the tab in UI
        loadChannel(existingChannel);            // load any existing channels from server
        addUserChannel(existingChannel);         // keep track of channels belonging to user
        reportNewChannelUser(existingChannel);   // tells server that new user exists + broadcasts

        return false;
    }

    // Defines steps taken when a new app user is created
    document.querySelector('#newUserForm').onsubmit = () => {
        const newUser = document.querySelector('#usernameField').value;
        launchNewUser(newUser);
        return false;
    }

    // When server says a new channel is available...
    socket.on('announce channel', data => {
        const parsedData = JSON.parse(data);
        addNewChannelOption(parsedData['new_channel']);
    });

    // When server says a new user was added to a channel...
    socket.on('new channel user', data => {
        const parsedData = JSON.parse(data);
        addAnnouncement(parsedData['username'], parsedData['cleanedChannelName']);
    });

    // When server says a new message should be added to a channel...
    socket.on('new message', data => {
        addMessageToChannel(JSON.parse(data));
    });

    // Ask user to submit a username, if it doesn't exist
    if (!localStorage.getItem('userIdentity')) {
        document.getElementById('popup').style.display='block';
    } else {
        launchExistingUser()
    }
});


/*
 * Takes care of all elements for creating new application user; provide the server
 * with a new username and if the server returns that the username isn't already taken
 * ('available) setup elements of the application (i.e., the main 'Welcome' channel).
 * If the server responds that the user is already taken, prompts the user to provide
 * another username.
 *
 * @param String username       the username provided in the input form by a user.
 */
function launchNewUser(username) {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/create_user');

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
            document.getElementById("defaultOpen").click();

        } else {
            // prompt user to provide another username
            document.querySelector('#status').innerHTML = 'Username Already Taken.';
        }
    }
    // ask server if the username already exists
    const data = new FormData();
    data.append('username', username);
    request.send(data);
    return false;
}


/*
 * In the case that the user has already created a username,
 * get what channels the user had previously from localStorage and load
 * whatever messages/announcements existed from the server.
 */
function launchExistingUser() {

    loadAvailableChannels();                     // get all channel options that are available on server
    const listChannels = getListUserChannels();  // get channels associated with the user in localStorage

    // ... then create and load in each of the user's channels
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


/*
 * Loads all elements (messages and announcements) of the channel saved in
 * the server via an XMLHttpRequest and adds elements to the webpage's HTML
 * as needed. If request is unsuccessful, alerts user that something didn't work.
 *
 * @param String channelName   the (uncleaned) channel name
 */
function loadChannel(channelName) {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/messages');

    // Callback function for when request completes
    request.onload = () => {

        const data = JSON.parse(request.responseText);

        // if the request was successful and there are items to load, create each message/announcement
        if (data.success && data.messages != null) {

            const messageInfo = JSON.parse(data.messages);
            for (let message in messageInfo['messages']) {

                var messageContent = messageInfo['messages'][message];
                if (messageContent['type'] === 'message') addMessageToChannel(messageContent);
                else if (messageContent['type'] === 'announcement') {
                    addAnnouncement(messageContent.user, messageContent.cleanedChannelName);
                }
            }
        } else if (!data.success) {
            alert(`Warning! Something bad happened when attempting to load ${channelName}`);
        }
    }

    // ask server to get all messages stored for the channel
    const data = new FormData();
    data.append('channelName', channelName);
    request.send(data);
    return false;
}


/*
 * Loads all channels that are "available" (i.e., have been created by users and
 * that are stored on the server) and create a new channel option in the 'Add an
 * Existing Channel' drop down menu.
 */
function loadAvailableChannels() {

    const request = new XMLHttpRequest();
    request.open('POST', '/api/available_channels');

    request.onload = () => {

        const data = JSON.parse(request.responseText);

        // for each available channel, make a new option
        for (let channelName in data.availableChannels) {
           addNewChannelOption(data.availableChannels[channelName])
        }
    }

    // ask server to get all available channels
    request.send();
    return false;
}


/*
 * Prompted when a user clicks on a channel tab, method "opens" the channel by making
 * the associated channel panel display and the channel tab "active."
 */
function openChannel() {

    // Make other panels display as none
    const channels = document.getElementsByClassName("channel");
    for (let channel of channels) {
        channel.style.display = "none";
    }
    // the data-channelName attribute of the button = the id of the content box to display
    const channelName = this.dataset.channelname
    document.getElementById(channelName.replace(/\W/g, '')).style.display = "block";

    // change all buttons to inactive
    const channelTabs = document.getElementsByClassName("channelTab");
    for (let tab of channelTabs) {

        // first, by default, switch to inactive
        tab.className = tab.className.replace(" active", "");
    }

    // change "this" channel to active and read
    this.className += " active";
    this.className = this.className.replace(" unread", "");
}


/*
 * Prompted when a user clicks the 'Enter' button to send a new message, sends the message
 * to the server to save in channel and broadcast.
 *
 * @param Event the 'onsubmit' event when user clicks 'Enter' button
 */
function emitMessage(e) {

    var socketMessage = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    // tell the server about the new message
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

    // reset the new message field in UI to be blank
    document.getElementById(e.target.id + "Value").value = "";
    return false;
}


/*
 * Prompted when a user clicks to create a new channel, sends the name of the channel
 * to the server to be stored as a new channel option and be broadcast to all users.
 *
 * @param String channelName   the new (uncleaned) channel name submitted by the user
 */
function emitNewAvailableChannel(channelName) {

    var newChannelSocket = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    // tell the server a new channel is available
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


/*
 * Called whenever a user creates a new channel or adds themselves to an existing channel,
 * tells server to add a new user to the channel and broadcast to all users of the channel
 * that someone else was added.
 *
 * @param String channelName   the (uncleaned) channel name user wants to add themselves to
 */
function reportNewChannelUser(channelName) {

    var socketChannel = io.connect(
        location.protocol + '//' + document.domain + ':' + location.port
    );

    // tell server that a new user should be added to the channel
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


/*
 * Called whenever a user creates a new channel or adds themselves to an existing channel,
 * adds the name of the channel to the localStorage variable that saves the user's added
 * channels.
 *
 * @param String channelName   the (uncleaned) channel name user wants to add themselves to
 */
function addUserChannel(channelName) {

    // get the existing list of user channels and push the new channel name onto it
    var channelArray = getListUserChannels();
    if (!channelArray.includes(channelName)) channelArray.push(channelName)
    localStorage.setItem('userChannels', JSON.stringify(channelArray))
}


/*
 * Called when a new channel HTML element needs to be created and added to the DOM,
 * either during channel creation or when loading existing channels. This should be always
 * called in conjunction with addNewChannelTab.
 *
 * @param String channelName    the (uncleaned) name of the channel element being created
 */
function addNewChannel(channelName) {

    // create the HTML elements for the channel
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

    // add newly generated HTML elements to the DOM
    document.getElementById("channelContainer").appendChild(newChannel);

    // add the button's 'send' action
    document.querySelector(`#${cleanedChannelName}Form`).onsubmit = emitMessage;
}


/*
 * Called when a new channel tab HTML element needs to be created and added to the DOM,
 * either during channel creation or when loading existing channels. This should be always
 * called in conjunction with addNewChannel.
 *
 * @param String channelName   the (uncleaned) name of the channel element being created
 */
function addNewChannelTab(channelName) {

    const newTab = elementFactory(
        'button',
        {
            'class': 'channelTab',
            'name': `${channelName.replace(/\W/g, '')}Tab`,
            'data-channelname': channelName
        },
        channelName
    )
    newTab.onclick = openChannel;
    document.getElementById("tabList").appendChild(newTab);
}


/*
 * Adds a channel as an 'option' to the 'Add Existing Channels' dropdown menu
 * by generating new HTML elements and adding them DOM.
 *
 * @param String channelName   (uncleaned) name of the existing channel to add as option
 */
function addNewChannelOption(channelName) {
    const option = document.createElement('option');
    option.setAttribute('value', channelName);
    option.innerHTML = channelName;
    document.querySelector('#existingChannels').append(option);
}


/*
 * Called when a socket receives a real-time 'new message' event from the server or when
 * an existing user's channels are reloaded from the server and recreated. Creates HTML
 * message element (<p>) using elementFactory() function and it adds to DOM with formatting.
 *
 * @param json object data     a new message, parsed as json, that arrived from the server
 */
function addMessageToChannel(data) {

    // data should display different if message is from the user themselves
    var alignment, type;
    if (data.user === window.localStorage.getItem('userIdentity')) {
        alignment = "right";
        type = "self";
    } else {
        alignment = "left";
        type = "other";
    }

    // represents info about the message that should show in channel
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

    // actual message
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
    setTabUnread(data.channelName);
}

/*
 * Called on when an announcement needs to be added to the channel (i.e., when socket receives
 * alert that a user joined the channel). Creates HTML element (<p>) for the announcement
 * using elementFactory() function and it adds to DOM.
 *
 * @param String  username             the user that the announcement is referring to
 * @param String  cleanedChannelName   the 'cleaned' (only alphanumeric) version of the channel to add
 *                                     the announcement to.
 */
function addAnnouncement(username, cleanedChannelName) {

    var message;
    if (username === window.localStorage.getItem('userIdentity')) {
        message = 'You joined this channel.'
    } else {
        message = `${username} joined this channel.`
    }

    const userAnnouncement = elementFactory (
        'div',
        {},
        elementFactory(
            'p',
            { 'class': 'userAnnouncement'},
            message
        )
    );

    // if the element exists (i.e., the channel has been added for the user), then add announcement
    var channelChatter = document.getElementById(`${cleanedChannelName}Chat`);
    if (channelChatter != null) channelChatter.appendChild(userAnnouncement);
}


/*
 * Called when a new message is added to channel, changes the formatting of the channel
 * tab in the application if the user doesn't currently have that tab open to alert that
 * there is a new unread message.
 *
 * @param String channelName   the uncleaned name of the channel to set to unread
 */
function setTabUnread(channelName) {

    if (document.getElementsByClassName("active")[0].dataset.channelname != channelName) {

        var channelTab = document.getElementsByName(`${channelName.replace(/\W/g, '')}Tab`)[0];
        channelTab.className += " unread";
    }
}


/*
 * Returns channels stored in localStorage for the current user. Adds 'Welcome'
 * default channel if no channels yet set.
 *
 * @returns  list  current channels in localStorage
 */
function getListUserChannels() {

    if (localStorage.getItem('userChannels') != null) {
        var channels = JSON.parse(localStorage.getItem('userChannels'));
    } else {
        var channels = ['Welcome'];  // launchNewUser(), setup case
    }
    return channels;
}


/*
 * Function serving as a 'factory' for new HTML elements that need to be
 * more dynamically added to the webpage as events occur. More complex elements
 * can be added by using this function recursively.
 *
 * *** Please note that this helper function was inspired by work by Kyle Shevlin, found here:
 * (How to Write Your Own JavaScript DOM Element Factory, kyleshelvin.com)
 *
 * @param type          basic element type of the HTML element to be created
 * @param attributes    dictionary {key: value} of any attributes to add to new element
 * @param children      any number of 'child' elements (calls to elementFactory() again)
 * @returns             new HTML element
 */
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

