var drinks = {
    "Vodka": {
        "Walmart Blue": {
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"],
            "fact": "Tito's Vodka is made close by in Austin, TX"
        },
        "Moscow Mule": {
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"],
            "fact": "Tito's Vodka is made close by in Austin, TX"
        },
        "Texas Sipper": {
            "alcohol": "Vodka",
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"],
            "fact": "Tito's Vodka is made close by in Austin, TX"
        }
    },
    "Whiskey": {
        "Walmart Yellow": {
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"],
            "fact": "TX Blended Whiskey is made over in Fort Worth, TX"
        },
        "Texas Tea": {
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"],
            "fact": "TX Blended Whiskey is made over in Fort Worth, TX"
        }
    },
    "Beer": {
        "Shiner": {
            "type": "dark option",
            "fact": "Shiner is brewed in Shiner, TX"
        },
        "Fireman's 4": {
            "type": "light option",
            "fact": "Fireman's 4 is brewed in Blanco, TX"
        }
    },
    "Red Wine": {
        "Pinot Noir": {
            "type": "Mark West",
            "fact": 'COME UP WITH SOMETHING'
        },
        "Merlot": {
            "type": "Mark West",
            "fact": 'COME UP WITH SOMETHING'
        }
    },
    "White Wine": {
        "Chenin Blanc": {
            "type": "Llano Estacado",
            "fact": 'COME UP WITH SOMETHING'
        }
    }
};

(function(){
    var database = firebase.database();
    var ref = database.ref('users/');
    var badgeId = processId('badge_locator'); /////////////Fill this in///////////////////


    ref.once('value').then(function(snapshot) {
        if (snapshot.hasChild(badgeId)) {
            console.log('needs to be fixed');
            var user = snapshot.child(badgeId);
            var name = user.child('username').val();
            var drink_pref = user.child('drink_pref').val();
            var recommendation = recommendDrink(drink_pref);

            $('#suggestion').html("<h3>Hi there " + name + ", I'd recommend the " + recommendation.name + " seeing as you like " + drink_pref + ".</h3>" +
                                    "<h4>Fun fact: " + recommendation.fact + ".</h4>");

            database.ref(badgeId).update({
                barCount: (user.child('barCount')+1),
                prevRecommendation: recommendation.name
            })
        }
        else{
            $('#notFound').html("<h3>I'm sorry, I don't recognize you. Perhaps you need to sign up at the registration kiosk?</h3>");
        }
    });
})();


