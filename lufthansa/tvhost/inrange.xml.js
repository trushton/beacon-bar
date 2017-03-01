var Template = function() { return `<?xml version="1.0" encoding="UTF-8" ?>
<document>
  <head>
    <style>
    .bannerTitle {
        width:1920;
        text-align:center;
        color:white;
        background-color:black;
        padding:0 20 0 20;
    }
    .sectionTitle {
        background-color:rgb(128,128,128;
    }
    </style>
  </head>
  <listTemplate>
      <background>
          <img width="1920" height="1080" src="https://staging.newaer.com/kiosk/lufthansa/tvhost/inrange_background.jpg"/>
      </background>
    <banner>
       <title class="bannerTitle">Lufthansa Proximity</title>
    </banner>
    <list class="desc">
        <section id="immediateSection">
        <header>
            <title class="sectionTitle">Immediate</title>
        </header>
        </section>
        <section id="nearSection">
        <header>
            <title class="sectionTitle">Near</title>
        </header>
        </section>

        <section id="farSection">
        <header>
            <title class="sectionTitle">Far</title>
        </header>
        </section>

    </list>
  </listTemplate>
</document>`
}

