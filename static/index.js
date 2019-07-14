
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
            `Welcome to ${channelName}!`
        ),
        elementFactory (
            'div',
            {
                'class': 'container chat'
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
                {'class': 'submitNewMessage'},
                elementFactory(
                    'input',
                    {
                        'class': 'form-control newMessage',
                        'type': 'text',
                        'placeholder': 'Write a message',
                        'name': 'message'
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
    debugger;
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
