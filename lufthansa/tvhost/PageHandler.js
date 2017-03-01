var KioskState = {STATE_UNKNOWN:-1, STATE_NODEVICES:0, STATE_INRANGE:1, STATE_IMMEDIATE:2, STATE_CONFIG:3};

function PageHandler (options) {
    this.firstLoad = true;
    this.setupTime = 15;
    this.devices = [];
    this.options = options;
    this.state = KioskState.STATE_UNKNOWN;
    this.resourceLoader = new ResourceLoader(options.BASEURL);
    this.parser = new DOMParser();
    this.currentDocument = null;
    this.interval = null;
    this.setupFlag = false;
}

PageHandler.prototype = {
    constructor: PageHandler,
    didFindDevice: function (device) {
        if(this.setupFlag == false) {
            switch (this.state) {
                case KioskState.STATE_NODEVICES:
                    // Ignore
                    break;
                case KioskState.STATE_INRANGE:
                    this.inrangeDidFindDevice(device);
                    break;
                case KioskState.STATE_IMMEDIATE:
                    this.immediateDidFindDevice(device);
                    break;
                default:
                    break;
            }
        }
        this.devices[device.deviceId] = device;
    },
    didLoseDevice: function (device) {
        if(this.setupFlag == false) {
            switch (this.state) {
                case KioskState.STATE_NODEVICES:
                    // Ignore
                    break;
                case KioskState.STATE_INRANGE:
                    this.inrangeDidLoseDevice(device);
                    break;
                case KioskState.STATE_IMMEDIATE:
                    this.immediateDidLoseDevice(device);
                    break;
                default:
                    break;
            }
        }

        delete this.devices[device.deviceId];
    },

    didUpdateDevice: function (device) {
        if(this.devices[device.deviceId] == null) {
            this.didFindDevice(device);
            return;
        }
        if(this.setupFlag == false) {
            switch (this.state) {
                case KioskState.STATE_NODEVICES:
                    // Ignore
                    break;
                case KioskState.STATE_INRANGE:
                    this.inrangeDidUpdateDevice(device);
                    break;
                case KioskState.STATE_IMMEDIATE:
                    this.immediateDidUpdateDevice(device);
                    break;
                default:
                    break;
            }
        }

        this.devices[device.deviceId] = device;
    },

    updateState: function(state) {
        if(state == this.state) return;
        if(this.setupFlag == true) return;
//        if(this.state == KioskState.STATE_CONFIG) return;

        if(this.interval != null) {
            clearInterval(this.interval);
            this.interval = null;
        }
        switch(parseInt(state)) {
            case KioskState.STATE_NODEVICES: // STATE_NODEVICES: No Devices
                this.loadPageResource('nodevices.xml.js',this.noneBind);
                break;
            case KioskState.STATE_INRANGE: // STATE_INRANGE: In Range
                this.loadPageResource('inrange.xml.js',this.inrangeBind);
                break;
            case KioskState.STATE_IMMEDIATE: // STATE_IMMEDIATE: Immediate
                this.loadPageResource('immediate.xml.js',this.immediateBind);
                break;
/*            case KioskState.STATE_CONFIG: // STATE_CONFIG
                this.loadPageResource('config.xml.js',this.configBind);
                break;*/
        }

        this.state = state;
    },

    loadPageResource: function(pagename,callback) {
        var index = this.resourceLoader.loadResource(this.options.BASEURL+pagename, function (resource) {
            var doc = pageHandler.parser.parseFromString(resource, "application/xml");
            callback(doc);

            if(this.currentDocument == null) {
                navigationDocument.pushDocument(doc)
            } else {
                if(pagename == "immediate.xml.js") {
//                    pageHandler.immediateDidUpdateDevice(null);
                }
                navigationDocument.replaceDocument(doc, this.currentDocument)
            }
            this.currentDocument = doc;
        });
    },

    noneBind: function(document) {
        pageHandler.interval = setInterval(pageHandler.noneInterval,1000);
        var reloadItem = document.getElementById('reloadItem');
        reloadItem.addEventListener("select",function(event) {
            console.log("Clicked Reload");
            reloadApp();
        });
        var setupItem = document.getElementById('setupItem');
        setupItem.addEventListener("select",function(event) {
            console.log("Clicked Setup");
            launchSetup();
        });
    },

/*    configBind: function(document)
    {
        var doneItem = document.getElementById('doneItem');
        doneItem.addEventListener("select",function(event) {
            console.log("Clicked config/done");
            reloadApp();
        });
    },*/

    noneInterval: function() {
        if(pageHandler.setupFlag == true) return;
        console.log("noneInterval");
        pageHandler.firstLoad = false;
        if(pageHandler.setupTime-- <= 0) {
            var el = getActiveDocument().getElementById('setupItem');
            el.parentNode.removeChild(el);
            clearInterval(pageHandler.interval);
        } else {
            var el = getActiveDocument().getElementById('setupTitle');
            el.textContent = "Setup (" + pageHandler.setupTime + ")";
        }
    },

    inrangeBind: function(document) {
        pageHandler.interval = setInterval(pageHandler.inrangeInterval,2000);
    },

    inrangeInterval: function() {
        if(pageHandler.setupFlag == true) return;
        console.log("inrangeInterval");
        for (var key in pageHandler.devices) {
            pageHandler.didUpdateDevice(pageHandler.devices[key]);
        }
    },

    immediateBind: function(document) {
        document.addEventListener("select", function(event) {
            console.log("Clicked select");
            pageHandler.sendCoupon();
        });
//        pageHandler.immediateDidUpdateDevice(null);
    },

    inrangeDidFindDevice: function(device) {
        var parEl;
        if(device.proximityString == "Immediate") {
            parEl = getActiveDocument().getElementById('immediateSection');
        } else if(device.proximityString == "Near") {
            parEl = getActiveDocument().getElementById('nearSection');
        } else {
            parEl = getActiveDocument().getElementById('farSection');
        }
        if(parEl == null) return;
        var newLiLockup = getActiveDocument().createElement('listItemLockup');
        newLiLockup.setAttribute('id',device.deviceId);
        var newLiLockupTitle = getActiveDocument().createElement('title');
        newLiLockupTitle.textContent = device.userInfo.name;
        var newLiLockupSubTitle = getActiveDocument().createElement('subtitle');
        newLiLockupSubTitle.textContent = "just now";
        var newLiLockupTitleDecLabel = getActiveDocument().createElement('decorationLabel');
        newLiLockupTitleDecLabel.textContent = device.signalStrength;
        newLiLockup.appendChild(newLiLockupTitle);
        newLiLockup.appendChild(newLiLockupSubTitle);
        newLiLockup.appendChild(newLiLockupTitleDecLabel);
        parEl.appendChild(newLiLockup);
    },

    inrangeDidUpdateDevice: function(device) {
        console.log("didUpdateDevice: "+device.deviceId+", "+device.proximityString+", "+device.seen);
        var thisEl = getActiveDocument().getElementById(device.deviceId);
        if(thisEl == null) {
            this.inrangeDidFindDevice(device);
            return;
        }
        thisEl.children.item(0).textContent = device.userInfo.name;
        thisEl.children.item(1).textContent = Math.round(Math.abs(Date.now()/1000.0 - device.seen)) + " sec ago, " + device.signalStrength;
        thisEl.children.item(2).textContent = device.userInfo.recordLocator;

        if(this.devices[device.deviceId].proximityString != device.proximityString) {
            console.log("Device changed category!");

            var copyEl = thisEl.cloneNode(true);
            thisEl.parentNode.removeChild(thisEl);

            var newParEl;
            if(device.proximityString == "Immediate") {
                newParEl = getActiveDocument().getElementById('immediateSection');
            } else if(device.proximityString == "Near") {
                newParEl = getActiveDocument().getElementById('nearSection');
            } else {
                newParEl = getActiveDocument().getElementById('farSection');
            }

            newParEl.appendChild(copyEl);
        }
    },

    inrangeDidLoseDevice: function(device) {
        var lockupEle = getActiveDocument().getElementById(device.deviceId);
        lockupEle.parentNode.removeChild(lockupEle);
    },

    immediateDidFindDevice: function(device) {
        this.immediateDidUpdateDevice(device);
    },

    immediateDidUpdateDevice: function(device) {
        var highDevice = this.findStrongestDevice();
        if(highDevice == null) {
            highDevice = device;
        }
        if(highDevice == null) return;
        getActiveDocument().getElementById('deviceName').textContent = highDevice.userInfo.name;
        getActiveDocument().getElementById('recordLocator').textContent = highDevice.userInfo.recordLocator;
    },

    immediateDidLoseDevice: function(device) {
        return;
    },

    findStrongestDevice: function() {
        var highSignal = -100;
        var highDeviceId = "";

        for(var key in this.devices) {
            if(parseInt(this.devices[key].signalStrength) > highSignal) {
                highSignal = this.devices[key].signalStrength;
                highDeviceId = key;
            }
        }
        if(highDeviceId == "") return null;
        return this.devices[highDeviceId];
    },

    sendCoupon: function()
    {
        var highDevice = this.findStrongestDevice();
        sendCoupon(highDevice.deviceId,"http://staging.newaer.com/dtad/sink/Coupon.pkpass");
    }

}


