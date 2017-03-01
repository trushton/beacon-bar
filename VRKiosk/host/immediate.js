function getBadgeId(facebookId){
    firebase.database().ref('badges/').once('value').then(function(snapshot){
       return snapshot.child(facebookId).child('badge').val();
    });
}

$(document).ready(function(){

});
