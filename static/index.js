
document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.channelTab').forEach(button => {
        button.onclick = openChannel;
    })

    document.querySelector('#newChannelForm').onsubmit = () => {

        // create new channel elements
        const newChannelName = document.querySelector('#newChannelName').value;
        createNewChannel(newChannelName);
        createNewChannelTab(newChannelName);

        // reset the form, don't reload
        document.querySelector('#newChannelForm').reset();
        return false;
    }

    // Get the element with id="defaultOpen" and click on it
    document.getElementById("defaultOpen").click();
});


// HELPER FUNCTIONS

// factory function for generating elements ()
function createNewChannel(channelName) {

    // create the div
    const newChannel = document.createElement('div');
    newChannel.setAttribute("class", "channel");
    newChannel.setAttribute("id", channelName);
    newChannel.style.display = "none";

    // create the header
    const header = document.createElement('h3');
    const headerText = document.createTextNode(`Welcome to ${channelName}!`);
    header.appendChild(headerText);
    newChannel.appendChild(header);

    // create the 'chat' holder (temp)
    const chatContainer = document.createElement('div')
    chatContainer.setAttribute("class", "container chat")
    const intro = document.createElement('p');
    intro.appendChild(document.createTextNode('Start your conversation...'));
    chatContainer.appendChild(intro)
    newChannel.appendChild(chatContainer);

    // add back into the channel list
    document.getElementById("channelContainer").appendChild(newChannel);
}

function createNewChannelTab(channelName) {

    // create the button
    const newTab = document.createElement('button');
    newTab.onclick = openChannel;

    // add attributes
    newTab.setAttribute("class", "channelTab");
    newTab.setAttribute("data-channelname", channelName);

    // add text to button
    const tabText = document.createTextNode(channelName);
    newTab.appendChild(tabText);

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
