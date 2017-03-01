var Template = function() { return `<?xml version="1.0" encoding="UTF-8" ?>
<document>
    <head>
    <style>
    .left {
        tv-position: top-left;
        margin:100;
    }
    .button1,.button2 {
        width:300;
    }
    .welcomeTitle {
        font-size:50;
        margin:40 0 40 0;
    }
    .infoDescription {
        font-size:40;
    }
    .infoDescriptionIndent {
        font-size:40;
        margin:0 40 40 40;
    }
    .buttons {
        tv-position: bottom-left;
        font-size:20;
        width:300;
        height:150;
        margin:0 0 200 100;
    }
    .spacerText {
        margin:100;
    }
    </style>
    </head>
  <divTemplate>
      <background>
          <img width="1920" height="1080" src="https://staging.newaer.com/kiosk/lufthansa/tvhost/immediate_background.jpg"/>
      </background>
      <lockup class="left">
    <title class="welcomeTitle">Welcome Guest</title>
    <description class="infoDescription">Name</description>
    <description class="infoDescriptionIndent" id="deviceName">[name]</description>
    <description class="infoDescription">Locator</description>
    <description class="infoDescriptionIndent" id="recordLocator">[record locator]</description>
    </lockup>
    <lockup class="buttons">
        <button class="controlButton" id="button1">
          <text>Send Coupon</text>
        </button>
        <button class="controlButton" id="button2">
          <text>NewAer Developer Portal</text>
        </button>
    </lockup>
  </divTemplate>
</document>`
}

