function displayData(){
    var ref = firebase.database().ref('users/'+ getQueryStringValue('badge'));
    ref.once('value').then(function(snapshot){
        $('.thankUser').text("Thank you " + snapshot.child('username').val()
        + " for coming to The Spark VIP Lounge at Capital Factory.");
        var image = document.createElement("img");
        var parent = document.getElementById("bod");
        image.id = "userImage";
        image.src = snapshot.child('picture').val();
        parent.appendChild(image);
    });
}

$(document).ready(function(){
    displayData();
});

function getQueryStringValue (key) {
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}