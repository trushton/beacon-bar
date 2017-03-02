function displayData(){
    var ref = firebase.database().ref('users/'+localStorage.getItem("currentDevice"));
    ref.once('value').then(function(snapshot){
        $('.thankUser').text("Thank you " + snapshot.child('username').val()
        + " for coming to The Spark VIP Lounge at Capital Factory.");
        var image = document.createElement("img");
        var parent = document.getElementById("bod");
        image.id = "userImage";
        image.src = $('.userImage').image(snapshot.child('picture').val());
        parent.appendChild(image);
    });
}

$(document).ready(function(){
    displayData();
});
