
document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.channelTab').forEach(button => {
        button.onclick = openChannel;
    })
    // Get the element with id="defaultOpen" and click on it
    debugger;
    document.getElementById("defaultOpen").click();
});

// factory function for generating elements ()
function channelFactory(type, attributes, ...children) {
    const element = document.createElement(type);

    for (attribute in attributes) {
        element.setAttribute(attribute, attributes[attribute]);
    }
}

function openChannel() {

    // Make other panels display as none
    debugger;
    var channels = document.getElementsByClassName("channel");
    for (var i = 0; i < channels.length; i++) {
        channels[i].style.display = "none";
    }
    // the data-channelName attribute of the button = the id of the content box to display
    var channelName = this.dataset.channelname
    debugger;
    document.getElementById(channelName).style.display = "block";

    // change all buttons to inactive, except "this" button
    var channelTabs = document.getElementsByClassName("channelTab");
    for (var i = 0; i < channelTabs.length; i++) {
        // first, by default, switch to inactive
        channelTabs[i].className = channelTabs[i].className.replace(" active", "");
    }
    this.className += " active";
}
